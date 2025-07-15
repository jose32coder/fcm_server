import admin from "@/lib/firebaseAdmin";

const db = admin.firestore();

export async function notificarAdministradoresYGimnasio(
  gimnasioId,
  usuarioData,
  usuarioId,
  nuevoEstado
) {
  try {
    // Obtener administradores y dueños del gimnasio
    const adminsSnapshot = await db
      .collection("gimnasios")
      .doc(gimnasioId)
      .collection("usuarios")
      .where("tipo", "in", ["Administrador", "Dueño"])
      .get();

    if (adminsSnapshot.empty) {
      console.log(
        `ℹ️ No hay administradores/dueños para el gimnasio ${gimnasioId}`
      );
      return;
    }

    // Filtrar administradores con token válido
    const adminsConToken = adminsSnapshot.docs
      .map((doc) => ({ id: doc.id, token: doc.data().token }))
      .filter(
        (admin) => typeof admin.token === "string" && admin.token.length > 10
      );

    if (adminsConToken.length === 0) {
      console.log(
        `ℹ️ No hay administradores/dueños con token registrado para notificar.`
      );
      return;
    }

    const tokens = adminsConToken.map((a) => a.token);

    if (tokens.length === 0) {
      console.log("⚠️ No hay tokens válidos para enviar notificación.");
      return;
    }

    // Construir payload de notificación
    const payloadNotification = {
      title: `Cambio de estado usuario ${usuarioId}`,
      body: `El usuario ha cambiado a estado ${nuevoEstado}`,
      sound: "default",
    };

    const payloadData = {
      gimnasioId,
      usuarioId,
      nuevoEstado,
      tipoNotificacion: "estadoUsuario",
    };

    // Enviar notificación
    const response = await admin.messaging().sendMulticast({
      tokens,
      notification: payloadNotification,
      data: payloadData,
    });

    console.log(
      `📲 Notificaciones enviadas: ${response.successCount} exitosas, ${response.failureCount} fallidas.`
    );

    // Construir registro de notificación para Firestore
    const notificacionData = {
      titulo: payloadNotification.title,
      mensaje: payloadNotification.body,
      fechaEnvio: admin.firestore.FieldValue.serverTimestamp(),
      tipo: "estadoUsuario",
      tokensDestino: tokens,
      exitosos: response.successCount,
      fallidos: response.failureCount,
      detalles: response.responses.map((resp, idx) => ({
        token: tokens[idx],
        success: resp.success,
        error: resp.error ? resp.error.message : null,
      })),
    };

    // Guardar notificación en colección general del gimnasio
    await db
      .collection("gimnasios")
      .doc(gimnasioId)
      .collection("notificaciones")
      .add(notificacionData);

    // Guardar copia en subcolección de cada administrador/dueño
    const batch = db.batch();

    adminsConToken.forEach((adminUser) => {
      const userNotificacionRef = db
        .collection("gimnasios")
        .doc(gimnasioId)
        .collection("usuarios")
        .doc(adminUser.id)
        .collection("notificaciones")
        .doc();

      batch.set(userNotificacionRef, {
        ...notificacionData,
        fechaEnvio: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();

    console.log(
      `📝 Notificación registrada en subcolecciones de administradores/dueños`
    );
  } catch (error) {
    console.error(`❌ Error notificando administradores/gimnasio:`, error);
    throw error; // Propaga el error para poder capturarlo en el endpoint que llama a esta función
  }
}
