import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      type: process.env.FIREBASE_TYPE,
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
    }),
  });
}

const db = admin.firestore();

async function notificarAdministradoresYGimnasio(
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
        `ℹ️ No hay administradores/dueños con token registrado en este gimnasio`
      );
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

    response.responses.forEach((resp, idx) => {
      if (resp.error) {
        console.error(`❌ Error enviando a token ${tokens[idx]}:`, resp.error);
      }
    });

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

    console.log(
      `📝 Notificación registrada en subcolecciones de administradores/dueños para gimnasio ${gimnasioId}`
    );
  } catch (error) {
    console.error(`❌ Error notificando administradores/gimnasio:`, error);
  }
}

export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      const { gimnasioId, usuarioData, usuarioId, nuevoEstado } = req.body;

      if (!gimnasioId || !usuarioId || !nuevoEstado) {
        return res.status(400).json({ error: "Faltan datos obligatorios" });
      }

      await notificarAdministradoresYGimnasio(
        gimnasioId,
        usuarioData,
        usuarioId,
        nuevoEstado
      );

      return res
        .status(200)
        .json({ message: "Notificación enviada correctamente" });
    }

    if (req.method === "GET") {
      const message = {
        notification: {
          title: "Notificación de prueba",
          body: "Este es un mensaje de prueba enviado desde Vercel.",
        },
        topic: "general",
      };

      const response = await admin.messaging().send(message);
      return res.status(200).json({ message: "Notificación general enviada" });
    }

    res.status(405).json({ error: "Método HTTP no soportado" });
  } catch (error) {
    console.error("❌ Error en la función:", error);
    res.status(500).json({ error: error.message });
  }
}
