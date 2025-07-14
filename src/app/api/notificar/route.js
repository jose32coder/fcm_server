import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";

export async function GET() {
  try {
    const message = {
      notification: {
        title: "Notificación de prueba",
        body: "Este es un mensaje de prueba enviado desde localhost.",
      },
      topic: "general",
    };

    const response = await admin.messaging().send(message);
    return NextResponse.json({ message: "Notificación enviada", response });
  } catch (error) {
    console.error("❌ Error en GET:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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

    // Función que debes definir en este archivo o importar
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
