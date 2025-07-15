import admin from "@/lib/firebaseAdmin";
import { notificarAdministradoresYGimnasio } from "@/lib/notificaciones";
import { NextResponse } from "next/server";

const db = admin.firestore();

export async function POST(request) {
  // 📌 Verificar token de autorización
  const token = request.headers.get("authorization");

  if (!token || token !== `Bearer ${process.env.CRON_SECRET}`) {
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

    // 📌 Buscar gimnasio por código
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

    // 📌 Obtener usuarios del gimnasio
    const usuariosSnapshot = await db
      .collection("gimnasios")
      .doc(gimnasioId)
      .collection("usuarios")
      .get();

    const ahora = new Date();
    const batch = db.batch();

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

        await notificarAdministradoresYGimnasio(
          gimnasioId,
          user,
          doc.id,
          nuevoEstado
        );
      }
    }

    await batch.commit();

    return NextResponse.json({
      message: "Estados actualizados y notificaciones enviadas.",
    });
  } catch (error) {
    console.error("❌ Error en cron job:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Opcionalmente puedes manejar otros métodos para que no de 405 sin explicación
export function GET() {
  return NextResponse.json({ error: "Método no permitido" }, { status: 405 });
}
