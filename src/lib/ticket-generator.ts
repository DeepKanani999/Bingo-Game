// ============================================================
// Ticket Generator — Fair, unique ticket distribution
// Generates per-player boards that don't repeat across the game
// ============================================================

import type { BingoItem, BoardCell, TicketSize } from "./bingo-utils"
import { generateBingoBoard, getGridConfig, shuffleArray } from "./bingo-utils"

export interface GeneratedTicket {
  playerId: string
  cells: BoardCell[]
  ticketData: object // JSON-serializable for DB storage
}

/**
 * Generate unique tickets for all players in a game.
 * Each player gets a shuffled subset of the item pool.
 * No two players get the exact same board.
 */
export function generateTicketsForPlayers(
  playerIds: string[],
  itemPool: BingoItem[],
  ticketSize: TicketSize = "5x5"
): GeneratedTicket[] {
  const config = getGridConfig(ticketSize)
  const itemsNeeded = config.filledCells
  const tickets: GeneratedTicket[] = []
  const usedBoards = new Set<string>() // Track board fingerprints to avoid duplicates

  for (const playerId of playerIds) {
    let board: BoardCell[]
    let fingerprint: string
    let attempts = 0
    const maxAttempts = 100

    do {
      // Shuffle the pool and take the required number of items
      const shuffled = shuffleArray([...itemPool])
      const selectedItems = shuffled.slice(0, itemsNeeded)
      board = generateBingoBoard(selectedItems, ticketSize)
      // Create a fingerprint from item IDs in order
      fingerprint = board
        .filter((c) => !c.isFree && !c.isEmpty)
        .map((c) => c.item.id)
        .join(",")
      attempts++
    } while (usedBoards.has(fingerprint) && attempts < maxAttempts)

    usedBoards.add(fingerprint)

    // Create serializable ticket data for DB storage
    const ticketData = board.map((cell) => ({
      id: cell.id,
      row: cell.row,
      col: cell.col,
      isFree: cell.isFree,
      isEmpty: cell.isEmpty || false,
      itemId: cell.item.id,
      itemValue: cell.item.value,
      imageUrl: cell.item.imageUrl || null,
      dialogueText: cell.item.dialogueText || null,
      movieName: cell.item.movieName || null,
      hintText: cell.item.hintText || null,
    }))

    tickets.push({
      playerId,
      cells: board,
      ticketData,
    })
  }

  return tickets
}

/**
 * Reconstruct a BoardCell[] from stored ticket data (from DB).
 */
export function reconstructBoardFromTicketData(ticketData: any[]): BoardCell[] {
  return ticketData.map((cell: any) => ({
    id: cell.id,
    row: cell.row,
    col: cell.col,
    isFree: cell.isFree,
    isEmpty: cell.isEmpty || false,
    item: {
      id: cell.itemId,
      value: cell.itemValue,
      imageUrl: cell.imageUrl || undefined,
      dialogueText: cell.dialogueText || undefined,
      movieName: cell.movieName || undefined,
      hintText: cell.hintText || undefined,
    },
  }))
}

/**
 * Generate BingoItems from a number range.
 */
export function generateNumberItems(range: number): BingoItem[] {
  const items: BingoItem[] = []
  for (let i = 1; i <= range; i++) {
    items.push({ id: i.toString(), value: i.toString() })
  }
  return items
}

/**
 * Generate BingoItems from Bollywood mappings (from DB).
 */
export function generateBollywoodItems(
  mappings: Array<{
    number: number
    movie_name: string
    image_url?: string | null
    dialogue?: string | null
  }>
): BingoItem[] {
  return mappings.map((m) => ({
    id: m.number.toString(),
    value: m.number.toString(),
    movieName: m.movie_name,
    imageUrl: m.image_url || undefined,
    dialogueText: m.dialogue || undefined,
  }))
}
