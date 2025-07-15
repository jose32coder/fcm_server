import admin from "@/lib/firebaseAdmin";

const db = admin.firestore();

export async function notificarAdministradoresYGimnasioResumen(
  gimnasioId,
  mensaje
) {
  try {
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

    const payloadNotification = {
      title: `Actualización de estados en gimnasio`,
      body: mensaje,
      sound: "default",
    };

    const payloadData = {
      gimnasioId,
      tipoNotificacion: "resumenEstados",
    };

    const response = await admin.messaging().sendMulticast({
      tokens,
      notification: payloadNotification,
      data: payloadData,
    });

    console.log(
      `📲 Notificación resumen enviada: ${response.successCount} éxitos, ${response.failureCount} fallos.`
    );

    const notificacionData = {
      titulo: payloadNotification.title,
      mensaje: payloadNotification.body,
      fechaEnvio: admin.firestore.FieldValue.serverTimestamp(),
      tipo: "resumenEstados",
      tokensDestino: tokens,
      exitosos: response.successCount,
      fallidos: response.failureCount,
      detalles: response.responses.map((resp, idx) => ({
        token: tokens[idx],
        success: resp.success,
        error: resp.error ? resp.error.message : null,
      })),
    };

    // Guardar la notificación resumen en la colección principal
    await db
      .collection("gimnasios")
      .doc(gimnasioId)
      .collection("notificaciones")
      .add(notificacionData);

    // Guardar la notificación en las subcolecciones de los admins
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
      `📝 Notificación resumen registrada en subcolecciones de administradores/dueños`
    );
  } catch (error) {
    console.error(
      `❌ Error notificando resumen a administradores/gimnasio:`,
      error
    );
    throw error;
  }
}
