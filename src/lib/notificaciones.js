import admin from "@/lib/firebaseAdmin";

const db = admin.firestore();

export async function notificarAdministradoresYGimnasio(
  gimnasioId,
  usuarioData,
  usuarioId,
  nuevoEstado
) {
  try {
    const adminsSnapshot = await db
      .collection("gimnasios")
      .doc(gimnasioId)
      .collection("usuarios")
      .where("tipo", "in", ["Administrador", "Dueño"])
      .get();

    if (adminsSnapshot.empty) {
      console.log(`ℹ️ No hay administradores/dueños para el gimnasio ${gimnasioId}`);
      return;
    }

    const adminsConToken = adminsSnapshot.docs
      .map((doc) => ({ id: doc.id, token: doc.data().token }))
      .filter((admin) => typeof admin.token === "string" && admin.token.length > 10);

    if (adminsConToken.length === 0) {
      console.log(`ℹ️ No hay administradores/dueños con token registrado para notificar.`);
      return;
    }

    const tokens = adminsConToken.map((a) => a.token);

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

    const response = await admin.messaging().sendMulticast({
      tokens,
      notification: payloadNotification,
      data: payloadData,
    });

    console.log(
      `📲 Notificaciones enviadas: ${response.successCount} exitosas, ${response.failureCount} fallidas.`
    );

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

    await db
      .collection("gimnasios")
      .doc(gimnasioId)
      .collection("notificaciones")
      .add(notificacionData);

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

    console.log(`📝 Notificación registrada en subcolecciones de administradores/dueños`);
  } catch (error) {
    console.error(`❌ Error notificando administradores/gimnasio:`, error);
    throw error;
  }
}
