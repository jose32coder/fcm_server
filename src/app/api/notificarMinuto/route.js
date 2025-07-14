import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";

export async function GET() {
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
