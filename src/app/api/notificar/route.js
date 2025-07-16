import admin from "../../../../firebaseAdmin";
import { NextResponse } from "next/server";

const db = admin.firestore();
const messaging = admin.messaging();

export async function POST(request) {
  const SECRET_TOKEN = process.env.SECRET_TOKEN;
  const authHeader = request.headers.get("authorization");

  if (!authHeader || authHeader !== `Bearer ${SECRET_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const gimnasiosSnapshot = await db.collection("gimnasios").get();

    for (const gimnasioDoc of gimnasiosSnapshot.docs) {
      const gimnasioId = gimnasioDoc.id;
      const usuariosSnapshot = await db
        .collection("gimnasios")
        .doc(gimnasioId)
        .collection("usuarios")
        .get();

      const ahora = new Date();
      const batch = db.batch();
      let cambiosEstado = 0;

      for (const usuarioDoc of usuariosSnapshot.docs) {
        const user = usuarioDoc.data();
        const userRef = usuarioDoc.ref;

        const fechaCorte = user.fechaCorte?.toDate?.();
        if (!fechaCorte) continue;

        let nuevoEstado = user.estado;

        // Compara directamente los timestamps en lugar de días
        const tiempoRestante = fechaCorte - ahora;

        if (
          tiempoRestante > 0 &&
          tiempoRestante <= 5 * 24 * 60 * 60 * 1000 && // dentro de 5 días
          user.estado === "activo"
        ) {
          nuevoEstado = "pendiente";
        } else if (fechaCorte <= ahora && user.estado !== "inactivo") {
          nuevoEstado = "inactivo";
        }

        if (nuevoEstado !== user.estado) {
          batch.update(userRef, { estado: nuevoEstado });
          cambiosEstado++;
        }
      }

      await batch.commit();

      if (cambiosEstado > 0) {
        const mensaje =
          cambiosEstado === 1
            ? `Un usuario cambió de estado en tu gimnasio. Pulsa para revisar.`
            : `${cambiosEstado} usuarios cambiaron de estado en tu gimnasio. Pulsa para revisar.`;

        await notificarAdministradoresYGimnasioResumen(gimnasioId, mensaje);
      }
    }

    return NextResponse.json({ message: "Proceso finalizado correctamente" });
  } catch (error) {
    console.error("Error en notificación:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function notificarAdministradoresYGimnasioResumen(gimnasioId, mensaje) {
  const adminsSnapshot = await db
    .collection("gimnasios")
    .doc(gimnasioId)
    .collection("usuarios")
    .where("tipo", "in", ["Administrador", "Dueño"])
    .get();

  if (adminsSnapshot.empty) return;

  const tokens = adminsSnapshot.docs
    .map((doc) => doc.data().token)
    .filter((token) => typeof token === "string" && token.length > 10);

  if (tokens.length === 0) return;
  console.log("Tokens a notificar:", tokens);

  const payloadData = {
    gimnasioId,
    tipoNotificacion: "resumenEstados",
  };

  const payloadNotification = {
    tokens,
    notification: {
      title: `Actualización de estado`,
      body: mensaje,
    },
    android: {
      notification: {
        sound: "default",
      },
    },
    data: payloadData,
  };

  console.log("Messaging methods:", Object.keys(messaging));

  const response = await messaging.sendEachForMulticast(payloadNotification);

  response.responses.forEach((res, idx) => {
    if (res.success) {
      console.log(`✅ Notificación enviada a token ${idx}`);
    } else {
      console.error(`❌ Fallo en token ${idx}:`, res.error);
    }
  });

  console.log(
    `Notificación resumen enviada: ${response.successCount} éxitos, ${response.failureCount} fallos.`
  );
}
