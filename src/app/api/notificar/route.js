import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";

// Instanciamos la referencia a Firestore
const db = admin.firestore();

// Función para enviar notificaciones a admins/dueños del gimnasio
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
      .map((doc) => ({
        id: doc.id,
        token: doc.data().token,
      }))
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

// // GET: Enviar notificación general de prueba
// export async function GET() {
//   try {
//     const message = {
//       notification: {
//         title: "Notificación de prueba",
//         body: "Este es un mensaje de prueba enviado desde localhost.",
//       },
//       topic: "general",
//     };

//     const response = await admin.messaging().send(message);
//     return NextResponse.json({ message: "Notificación enviada", response });
//   } catch (error) {
//     console.error("❌ Error en GET:", error);
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }

// POST: Notificar admins por cambio de estado de usuario
export async function POST(request) {
  try {
    const body = await request.json();
    const { gimnasioId, usuarioData, usuarioId, nuevoEstado } = body;

    if (!gimnasioId || !usuarioId || !nuevoEstado) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios" },
        { status: 400 }
      );
    }

    await notificarAdministradoresYGimnasio(
      gimnasioId,
      usuarioData,
      usuarioId,
      nuevoEstado
    );

    return NextResponse.json({ message: "Notificación enviada correctamente" });
  } catch (error) {
    console.error("❌ Error en POST:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
