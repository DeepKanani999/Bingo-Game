import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { gameId, hostSecret, action } = body

    if (!gameId || !hostSecret || !action) {
      return NextResponse.json(
        { error: "Game ID, host secret, and action are required" },
        { status: 400 }
      )
    }

    // 1. Authenticate host secret
    const { data: game, error: gameError } = await supabaseAdmin
      .from("games")
      .select("*")
      .eq("id", gameId)
      .single()

    if (gameError || !game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    if (game.host_secret !== hostSecret) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
    }

    // 2. Perform actions
    const updates: Record<string, any> = {}
    let eventType = ""

    switch (action) {
      case "start":
        updates.status = "active"
        if (game.auto_call) {
          const seconds = game.call_interval || 10
          updates.next_call_at = new Date(Date.now() + seconds * 1000).toISOString()
          updates.auto_call_active = true
        }
        eventType = "started"
        break

      case "pause":
        updates.paused = true
        updates.next_call_at = null
        eventType = "paused"
        break

      case "resume":
        updates.paused = false
        if (game.auto_call) {
          const seconds = game.call_interval || 10
          updates.next_call_at = new Date(Date.now() + seconds * 1000).toISOString()
          updates.auto_call_active = true
        }
        eventType = "resumed"
        break

      case "end":
        updates.status = "ended"
        updates.next_call_at = null
        eventType = "ended"
        break

      case "reset":
        // Resetting the game involves clearing called_items, player_marks, claims, and prize_locks
        const { data: gamePlayers } = await supabaseAdmin
          .from("players")
          .select("id")
          .eq("game_id", gameId)
        
        const playerIds = gamePlayers?.map(p => p.id) || []

        // Delete marks
        if (playerIds.length > 0) {
          await supabaseAdmin.from("player_marks").delete().in("player_id", playerIds)
        }

        // Delete called items
        await supabaseAdmin.from("called_items").delete().eq("game_id", gameId)

        // Delete claims
        await supabaseAdmin.from("claims").delete().eq("game_id", gameId)

        updates.status = "lobby"
        updates.paused = false
        updates.next_call_at = null
        updates.auto_call_active = false
        eventType = "reset"
        break

      case "update_next_call":
        const seconds = game.call_interval || 10
        updates.next_call_at = new Date(Date.now() + seconds * 1000).toISOString()
        break

      case "update_mapping":
        const { mappingId, movieName, dialogue, imageUrl } = body
        if (!mappingId || !movieName) {
          return NextResponse.json({ error: "Mapping ID and movie name are required" }, { status: 400 })
        }
        const { error: mappingError } = await supabaseAdmin
          .from("bollywood_mappings")
          .update({ movie_name: movieName, dialogue, image_url: imageUrl })
          .eq("id", mappingId)

        if (mappingError) {
          console.error("Mapping update error:", mappingError)
          return NextResponse.json({ error: "Failed to update mapping" }, { status: 500 })
        }
        eventType = "updated_mapping"
        break

      case "update_prizes":
        const { prizes } = body
        if (!prizes) {
          return NextResponse.json({ error: "Prizes payload is required" }, { status: 400 })
        }
        const { error: prizesError } = await supabaseAdmin
          .from("games")
          .update({ prizes })
          .eq("id", gameId)

        if (prizesError) {
          console.error("Prizes update error:", prizesError)
          return NextResponse.json({ error: "Failed to update prizes" }, { status: 500 })
        }
        eventType = "updated_prizes"
        break

      case "delete_called_item":
        const { calledItemId } = body
        if (!calledItemId) {
          return NextResponse.json({ error: "Called item ID is required" }, { status: 400 })
        }
        // Get the called item to know its value
        const { data: itemToDelete } = await supabaseAdmin
          .from("called_items")
          .select("item_id")
          .eq("id", calledItemId)
          .single()

        const { error: deleteError } = await supabaseAdmin
          .from("called_items")
          .delete()
          .eq("id", calledItemId)

        if (deleteError) {
          console.error("Called item delete error:", deleteError)
          return NextResponse.json({ error: "Failed to delete called item" }, { status: 500 })
        }

        // Add the number back to game_events if needed
        eventType = "deleted_called_item"
        break

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    // 3. Perform game update
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from("games")
        .update(updates)
        .eq("id", gameId)

      if (updateError) {
        // If the error is about missing columns, retry without them
        const optionalColumns = ["next_call_at", "auto_call_active"]
        const hasOptionalCol = optionalColumns.some(col => 
          updateError.message?.includes(col)
        )

        if (hasOptionalCol) {
          const safeUpdates = { ...updates }
          optionalColumns.forEach(col => delete safeUpdates[col])

          if (Object.keys(safeUpdates).length > 0) {
            const { error: retryError } = await supabaseAdmin
              .from("games")
              .update(safeUpdates)
              .eq("id", gameId)

            if (retryError) {
              console.error("Game update retry error:", retryError)
              return NextResponse.json({ error: "Failed to update game state" }, { status: 500 })
            }
          }
        } else {
          console.error("Game update error:", updateError)
          return NextResponse.json({ error: "Failed to update game state" }, { status: 500 })
        }
      }
    }

    // 4. Track event
    if (eventType) {
      await supabaseAdmin.from("game_events").insert({
        game_id: gameId,
        event_type: eventType,
        payload: { action, details: body }
      })
    }

    return NextResponse.json({ success: true, updates })

  } catch (error) {
    console.error("Control route handler error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
