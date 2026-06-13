import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { reconstructBoardFromTicketData } from "@/lib/ticket-generator"
import { validateClaim } from "@/lib/claim-validator"
import type { ClaimType } from "@/lib/claim-validator"

export async function POST(request: Request) {
  try {
    const { gameId, playerId, claimType, claimIndex } = await request.json()

    if (!gameId || !playerId || !claimType) {
      return NextResponse.json(
        { error: "Game ID, player ID, and claim type are required" },
        { status: 400 }
      )
    }

    const typedClaimType = claimType as ClaimType
    const resolvedIndex = claimIndex !== undefined ? Number(claimIndex) : undefined

    // 1. Fetch Game and check status
    const { data: game, error: gameError } = await supabaseAdmin
      .from("games")
      .select("*")
      .eq("id", gameId)
      .single()

    if (gameError || !game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    if (game.status !== "active") {
      return NextResponse.json({ error: "Game is not active" }, { status: 400 })
    }

    // 2. Fetch Player Ticket
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from("player_tickets")
      .select("*")
      .eq("player_id", playerId)
      .eq("game_id", gameId)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Player ticket not found" }, { status: 404 })
    }

    const board = reconstructBoardFromTicketData(ticket.ticket_data as any[])

    // 3. Fetch Player Marks
    const { data: marks } = await supabaseAdmin
      .from("player_marks")
      .select("item_id")
      .eq("player_id", playerId)

    const markedItemIds = new Set<string>(marks?.map((m) => m.item_id) || [])

    // 4. Fetch Called Items
    const { data: calledItems } = await supabaseAdmin
      .from("called_items")
      .select("item_id")
      .eq("game_id", gameId)

    const calledItemValues = new Set<string>(calledItems?.map((ci) => ci.item_id.toString()) || [])

    // 5. Validate Claim server-side
    const validationResult = validateClaim(
      typedClaimType,
      resolvedIndex,
      board,
      markedItemIds,
      calledItemValues,
      game.ticket_size
    )

    if (!validationResult.valid) {
      // Record rejected claim
      await supabaseAdmin.from("claims").insert({
        game_id: gameId,
        player_id: playerId,
        claim_type: typedClaimType,
        is_valid: false,
        validation_reason: validationResult.reason,
        status: "rejected"
      })

      return NextResponse.json({
        success: false,
        valid: false,
        reason: validationResult.reason
      })
    }

    // 6. Check if this prize/pattern is already claimed
    const { data: existingClaims, error: checkError } = await supabaseAdmin
      .from("claims")
      .select("*")
      .eq("game_id", gameId)
      .eq("claim_type", typedClaimType)
      .eq("status", "approved")

    if (checkError) {
      console.error("Failed to check existing claims:", checkError)
      return NextResponse.json({ error: "Database error checking claims" }, { status: 500 })
    }

    const isAlreadyClaimed = existingClaims && existingClaims.length > 0

    if (isAlreadyClaimed) {
      const reason = "This prize has already been claimed by another player!"
      // Record rejected claim
      await supabaseAdmin.from("claims").insert({
        game_id: gameId,
        player_id: playerId,
        claim_type: typedClaimType,
        is_valid: false,
        validation_reason: reason,
        status: "rejected"
      })

      return NextResponse.json({
        success: false,
        valid: true, // It was technically a valid pattern, but prize is taken
        reason
      })
    }

    // 7. Insert approved claim
    const { data: claimRecord, error: claimInsertError } = await supabaseAdmin
      .from("claims")
      .insert({
        game_id: gameId,
        player_id: playerId,
        claim_type: typedClaimType,
        is_valid: true,
        validation_reason: validationResult.reason,
        status: "approved"
      })
      .select()
      .single()

    if (claimInsertError) {
      console.error("Approved claim insert error:", claimInsertError)
      return NextResponse.json({ error: "Failed to submit approved claim" }, { status: 500 })
    }

    // 8. Track Event
    await supabaseAdmin.from("game_events").insert({
      game_id: gameId,
      event_type: "won",
      payload: { playerId, claimType: typedClaimType, claimIndex: resolvedIndex }
    })

    return NextResponse.json({
      success: true,
      valid: true,
      status: "approved",
      claim: claimRecord
    })

  } catch (error) {
    console.error("Claim route handler error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
