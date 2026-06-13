import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { 
  generateNumberItems, 
  generateBollywoodItems, 
  generateTicketsForPlayers 
} from "@/lib/ticket-generator"

export async function POST(request: Request) {
  try {
    const { gameCode, display_name } = await request.json()

    if (!gameCode || !display_name) {
      return NextResponse.json(
        { error: "Game code and display name are required" },
        { status: 400 }
      )
    }

    const cleanCode = gameCode.trim().toUpperCase()
    const cleanName = display_name.trim()

    // 1. Fetch game details
    const { data: game, error: gameError } = await supabaseAdmin
      .from("games")
      .select("*")
      .eq("game_code", cleanCode)
      .single()

    if (gameError || !game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    if (game.status === "ended") {
      return NextResponse.json({ error: "This game has already ended" }, { status: 400 })
    }

    // 2. Fetch current player list to enforce capacity & unique name checks
    const { data: players, error: playersError } = await supabaseAdmin
      .from("players")
      .select("display_name")
      .eq("game_id", game.id)

    if (playersError) {
      return NextResponse.json({ error: "Failed to verify game players" }, { status: 500 })
    }

    const currentPlayers = players || []

    // Enforce max players
    if (currentPlayers.length >= (game.max_players || 20)) {
      return NextResponse.json({ error: "This game is full!" }, { status: 400 })
    }

    // Enforce unique name per game (case-insensitive)
    const nameTaken = currentPlayers.some(
      (p) => p.display_name.toLowerCase() === cleanName.toLowerCase()
    )
    if (nameTaken) {
      return NextResponse.json(
        { error: "This name is already taken in this game. Choose another." },
        { status: 400 }
      )
    }

    // 3. Generate Player ID and Join Token
    const playerId = crypto.randomUUID()
    const joinToken = crypto.randomUUID()

    // 4. Generate Board Ticket
    let itemsBase: any[] = []
    if (game.game_type === "number") {
      itemsBase = generateNumberItems(game.number_range || 90)
    } else if (game.game_type === "bollywood") {
      const { data: mappings, error: mappingsError } = await supabaseAdmin
        .from("bollywood_mappings")
        .select("*")
        .eq("game_id", game.id)

      if (mappingsError) {
        return NextResponse.json({ error: "Failed to retrieve Bollywood items" }, { status: 500 })
      }
      itemsBase = generateBollywoodItems(mappings || [])
    }

    const generated = generateTicketsForPlayers([playerId], itemsBase, game.ticket_size)[0]
    const ticketData = generated.ticketData

    // 5. Insert player
    const { error: playerInsertError } = await supabaseAdmin
      .from("players")
      .insert({
        id: playerId,
        game_id: game.id,
        join_token: joinToken,
        display_name: cleanName,
      })

    if (playerInsertError) {
      console.error("Player insert error:", playerInsertError)
      return NextResponse.json({ error: "Failed to join game" }, { status: 500 })
    }

    // 6. Insert ticket
    const { error: ticketInsertError } = await supabaseAdmin
      .from("player_tickets")
      .insert({
        player_id: playerId,
        game_id: game.id,
        ticket_data: ticketData,
      })

    if (ticketInsertError) {
      console.error("Ticket insert error:", ticketInsertError)
      // Rollback player creation
      await supabaseAdmin.from("players").delete().eq("id", playerId)
      return NextResponse.json({ error: "Failed to generate your ticket" }, { status: 500 })
    }

    // 7. Track Join Event
    await supabaseAdmin.from("game_events").insert({
      game_id: game.id,
      event_type: "joined",
      payload: { playerId, display_name: cleanName }
    })

    return NextResponse.json({
      success: true,
      gameId: game.id,
      playerId,
      playerName: cleanName,
      joinToken,
      status: game.status
    })

  } catch (error) {
    console.error("Join route handler error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
