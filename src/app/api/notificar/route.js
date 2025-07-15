import admin from "@/lib/firebaseAdmin";
import { notificarAdministradoresYGimnasio } from "@/lib/notificaciones";
import { NextResponse } from "next/server";

const db = admin.firestore();

export async function POST(request) {
  const SECRET_TOKEN = process.env.SECRET_TOKEN;
  const authHeader = request.headers.get("authorization");

  if (!authHeader || authHeader !== `Bearer ${SECRET_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { codigoGimnasio } = await request.json();

    if (!codigoGimnasio) {
      return NextResponse.json(
        { error: "Falta codigoGimnasio" },
        { status: 400 }
      );
    }

    const gimnasioSnapshot = await db
      .collection("gimnasios")
      .where("codigo", "==", codigoGimnasio)
      .get();

    if (gimnasioSnapshot.empty) {
      return NextResponse.json(
        { error: "No existe gimnasio con ese código" },
        { status: 404 }
      );
    }

    const gimnasioId = gimnasioSnapshot.docs[0].id;

    const usuariosSnapshot = await db
      .collection("gimnasios")
      .doc(gimnasioId)
      .collection("usuarios")
      .get();

    const ahora = new Date();
    const batch = db.batch();

    // Aquí se acumulan las promesas para enviar notificaciones
    const promesasNotificaciones = [];

    for (const doc of usuariosSnapshot.docs) {
      const user = doc.data();
      const userRef = doc.ref;

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

        // Se añade la promesa a la lista sin await aquí
        promesasNotificaciones.push(
          notificarAdministradoresYGimnasio(
            gimnasioId,
            user,
            doc.id,
            nuevoEstado
          ).catch((err) => {
            console.error(`Error notificando usuario ${doc.id}:`, err);
          })
        );
      }
    }

    await batch.commit();

    // Se esperan todas las notificaciones, pero no falla si una falla
    await Promise.allSettled(promesasNotificaciones);

    return NextResponse.json({
      message: "Estados actualizados y notificaciones enviadas.",
    });
  } catch (error) {
    console.error("❌ Error en cron job:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ error: "Método no permitido" }, { status: 405 });
}
