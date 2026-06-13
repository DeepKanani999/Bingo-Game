import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function POST(request: Request) {
  try {
    const { gameId, hostSecret, number } = await request.json()

    if (!gameId || !hostSecret) {
      return NextResponse.json(
        { error: "Game ID and host secret are required" },
        { status: 400 }
      )
    }

    // 1. Authenticate host
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

    if (game.status !== "active") {
      return NextResponse.json({ error: "Game is not active" }, { status: 400 })
    }

    // 2. Fetch called items
    const { data: calledItems, error: calledItemsError } = await supabaseAdmin
      .from("called_items")
      .select("item_id")
      .eq("game_id", gameId)

    if (calledItemsError) {
      return NextResponse.json({ error: "Failed to fetch called items" }, { status: 500 })
    }

    const calledSet = new Set(calledItems.map((ci) => ci.item_id.toString()))

    // 3. Determine remaining pool
    // Bollywood mappings count or standard number range (default 90)
    let range = game.number_range || 90
    if (game.game_type === "bollywood") {
      const { count } = await supabaseAdmin
        .from("bollywood_mappings")
        .select("*", { count: "exact", head: true })
        .eq("game_id", gameId)
      
      if (count && count > 0) {
        range = count
      }
    }

    const allNumbers: string[] = []
    for (let i = 1; i <= range; i++) {
      allNumbers.push(i.toString())
    }

    const remainingPool = allNumbers.filter((num) => !calledSet.has(num))

    if (remainingPool.length === 0) {
      return NextResponse.json({ error: "All numbers have already been called" }, { status: 400 })
    }

    // 4. Select number
    let selectedNumber = ""
    if (number !== undefined && number !== null) {
      const cleanNum = number.toString().trim()
      if (!remainingPool.includes(cleanNum)) {
        return NextResponse.json({ error: "Number is invalid or already called" }, { status: 400 })
      }
      selectedNumber = cleanNum
    } else {
      const randIdx = Math.floor(Math.random() * remainingPool.length)
      selectedNumber = remainingPool[randIdx]
    }

    // 5. Insert called item
    const order = calledItems.length + 1
    const { data: insertedItem, error: insertError } = await supabaseAdmin
      .from("called_items")
      .insert({
        game_id: gameId,
        item_id: selectedNumber,
        call_order: order,
      })
      .select()
      .single()

    if (insertError) {
      console.error("Called item insert error:", insertError)
      return NextResponse.json({ error: "Failed to record called number" }, { status: 500 })
    }

    // 6. Update next auto-call timestamp if auto-call is active and game is not paused
    const updates: Record<string, any> = {}
    if (game.auto_call && !game.paused) {
      const seconds = game.call_interval || 10
      updates.next_call_at = new Date(Date.now() + seconds * 1000).toISOString()
      
      // Gracefully handle missing next_call_at column
      const { error: tsError } = await supabaseAdmin
        .from("games")
        .update(updates)
        .eq("id", gameId)
      
      if (tsError) {
        console.warn("next_call_at update skipped (column may not exist):", tsError.message)
      }
    }

    // 7. Track Event
    await supabaseAdmin.from("game_events").insert({
      game_id: gameId,
      event_type: "called",
      payload: { number: selectedNumber, call_order: order }
    })

    return NextResponse.json({
      success: true,
      id: insertedItem.id,
      number: selectedNumber,
      call_order: order,
      next_call_at: updates.next_call_at || null
    })

  } catch (error) {
    console.error("Call number route handler error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
