import admin from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";

const db = admin.firestore();

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

        const diferenciaDias = Math.floor(
          (fechaCorte - ahora) / (1000 * 60 * 60 * 24)
        );

        let nuevoEstado = user.estado;

        if (
          diferenciaDias <= 5 &&
          diferenciaDias > 0 &&
          user.estado === "activo"
        ) {
          nuevoEstado = "pendiente";
        } else if (diferenciaDias <= 0 && user.estado !== "inactivo") {
          nuevoEstado = "inactivo";
        }

        if (nuevoEstado !== user.estado) {
          batch.update(userRef, { estado: nuevoEstado });
          cambiosEstado++;
        }
      }

      await batch.commit();

      if (cambiosEstado > 0) {
        const mensaje = `${cambiosEstado} usuario${
          cambiosEstado > 1 ? "s" : ""
        } cambiaron de estado en tu gimnasio. Pulsa para revisar.`;
        await notificarAdministradoresYGimnasioResumen(gimnasioId, mensaje);
      }
    }

    return NextResponse.json({ message: "Proceso finalizado correctamente" });
  } catch (error) {
    console.error("Error en notificación:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Función para enviar notificación resumen a administradores
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
    `Notificación resumen enviada: ${response.successCount} éxitos, ${response.failureCount} fallos.`
  );
}
