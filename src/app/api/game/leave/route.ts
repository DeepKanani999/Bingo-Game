import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function POST(request: Request) {
  try {
    const { gameId, playerId } = await request.json()

    if (!gameId || !playerId) {
      return NextResponse.json(
        { error: "Game ID and Player ID are required" },
        { status: 400 }
      )
    }

    // 1. Verify player is in the game
    const { data: player, error: playerError } = await supabaseAdmin
      .from("players")
      .select("display_name")
      .eq("id", playerId)
      .eq("game_id", gameId)
      .single()

    if (playerError || !player) {
      return NextResponse.json({ error: "Player not found in this game" }, { status: 404 })
    }

    // 2. Delete player record (cascades to delete tickets and marks)
    const { error: deleteError } = await supabaseAdmin
      .from("players")
      .delete()
      .eq("id", playerId)

    if (deleteError) {
      console.error("Player leave delete error:", deleteError)
      return NextResponse.json({ error: "Failed to leave game lobby" }, { status: 500 })
    }

    // 3. Track event
    await supabaseAdmin.from("game_events").insert({
      game_id: gameId,
      event_type: "left",
      payload: { playerId, display_name: player.display_name }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("Leave route handler error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
