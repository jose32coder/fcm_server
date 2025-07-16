import { NextResponse } from "next/server";
import admin from "../../../../firebaseAdmin";
import { notificarAdministradoresYGimnasio } from "@/lib/notificaciones";

const SECRET_TOKEN = process.env.SECRET_TOKEN;

async function validarAutorizacion(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || authHeader !== `Bearer ${SECRET_TOKEN}`) {
    return false;
  }
  return true;
}

export async function GET(request) {
  if (!(await validarAutorizacion(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const message = {
      notification: {
        title: "🕐 Notificación programada",
        body: "Esto es una notificación enviada cada minuto.",
      },
      topic: "general",
    };

    const response = await admin.messaging().send(message);
    return NextResponse.json({
      message: "Notificación enviada correctamente",
      response,
    });
  } catch (error) {
    console.error("❌ Error enviando notificación programada:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  if (!(await validarAutorizacion(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
