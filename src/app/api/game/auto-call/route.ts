import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function POST(request: Request) {
  try {
    const { gameId } = await request.json()

    if (!gameId) {
      return NextResponse.json({ error: "Game ID is required" }, { status: 400 })
    }

    // Call the thread-safe PL/pgSQL database function to trigger auto call atomically
    const { data, error } = await supabaseAdmin.rpc("trigger_auto_call", {
      p_game_id: gameId,
    })

    if (error) {
      console.error("Auto-call RPC error:", error)
      return NextResponse.json({ error: "Failed to trigger auto-call" }, { status: 500 })
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error("Auto-call route handler error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
