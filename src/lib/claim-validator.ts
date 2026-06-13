// ============================================================
// Claim Validator — Auto-validates bingo claims
// Checks: all claimed cells are marked, all are called, pattern correct
// ============================================================

import type { BoardCell, TicketSize } from "./bingo-utils"
import { getGridConfig } from "./bingo-utils"

export type ClaimType = "row" | "column" | "diagonal" | "full_house" | "early_five" | "corners" | "top_row" | "middle_row" | "bottom_row"

export interface ClaimValidationResult {
  valid: boolean
  reason: string
  claimedCells: BoardCell[]
}

/**
 * Validate a player's claim.
 * 
 * @param claimType - The type of claim
 * @param claimIndex - For row/column: which row/column (0-indexed).
 * @param board - The player's full board
 * @param markedItemIds - Set of item IDs the player has marked
 * @param calledItemValues - Set of item values that have been called by the host
 * @param ticketSize - The grid size
 */
export function validateClaim(
  claimType: ClaimType,
  claimIndex: number | undefined,
  board: BoardCell[],
  markedItemIds: Set<string>,
  calledItemValues: Set<string>,
  ticketSize: TicketSize = "5x5"
): ClaimValidationResult {
  const config = getGridConfig(ticketSize)

  // Step 1: Get the cells that form the claimed pattern
  let claimedCells: BoardCell[] = []

  switch (claimType) {
    case "row": {
      if (claimIndex === undefined || claimIndex < 0 || claimIndex >= config.rows) {
        return { valid: false, reason: "Invalid row index", claimedCells: [] }
      }
      claimedCells = board.filter((c) => c.row === claimIndex && !c.isEmpty)
      break
    }
    case "top_row": {
      claimedCells = board.filter((c) => c.row === 0 && !c.isEmpty)
      break
    }
    case "middle_row": {
      const mid = Math.floor(config.rows / 2)
      claimedCells = board.filter((c) => c.row === mid && !c.isEmpty)
      break
    }
    case "bottom_row": {
      claimedCells = board.filter((c) => c.row === config.rows - 1 && !c.isEmpty)
      break
    }
    case "column": {
      if (claimIndex === undefined || claimIndex < 0 || claimIndex >= config.cols) {
        return { valid: false, reason: "Invalid column index", claimedCells: [] }
      }
      claimedCells = board.filter((c) => c.col === claimIndex && !c.isEmpty)
      break
    }
    case "diagonal": {
      if (ticketSize !== "5x5") {
        return { valid: false, reason: "Diagonal claims only available for 5×5 grids", claimedCells: [] }
      }
      if (claimIndex === 0) {
        claimedCells = board.filter((c) => c.row === c.col)
      } else if (claimIndex === 1) {
        claimedCells = board.filter((c) => c.row + c.col === 4)
      } else {
        return { valid: false, reason: "Invalid diagonal index", claimedCells: [] }
      }
      break
    }
    case "corners": {
      const rowMax = config.rows - 1
      const colMax = config.cols - 1
      claimedCells = board.filter((c) => 
        !c.isEmpty && (
          (c.row === 0 && c.col === 0) ||
          (c.row === 0 && c.col === colMax) ||
          (c.row === rowMax && c.col === 0) ||
          (c.row === rowMax && c.col === colMax)
        )
      )
      break
    }
    case "early_five": {
      // Early five just needs ANY 5 marked cells that are also called
      // This is slightly different as it doesn't have a fixed "pattern"
      // we check if total marks >= 5 and all those marks are valid.
      const allMarkedCells = board.filter((c) => !c.isEmpty && (c.isFree || markedItemIds.has(c.item.id)))
      if (allMarkedCells.length < 5) {
        return { valid: false, reason: "You need at least 5 marks for Early Five", claimedCells: [] }
      }
      // For Early Five, we return the first 5 marked cells as the "pattern"
      claimedCells = allMarkedCells.slice(0, 5)
      break
    }
    case "full_house": {
      claimedCells = board.filter((c) => !c.isEmpty)
      break
    }
    default:
      return { valid: false, reason: "Unknown claim type", claimedCells: [] }
  }

  if (claimedCells.length === 0) {
    return { valid: false, reason: "No cells found for this pattern", claimedCells: [] }
  }

  // Step 2: Check that ALL cells in the pattern are marked
  const unmarkedCells = claimedCells.filter(
    (c) => !c.isFree && !markedItemIds.has(c.item.id)
  )
  if (unmarkedCells.length > 0) {
    const unmarkedValues = unmarkedCells.map((c) => c.item.value).join(", ")
    return {
      valid: false,
      reason: `Not all cells are marked. Missing: ${unmarkedValues}`,
      claimedCells,
    }
  }

  // Step 3: Check that ALL marked cells in the pattern have actually been called
  const uncalledMarks = claimedCells.filter(
    (c) => !c.isFree && !calledItemValues.has(c.item.value.toString()) && !calledItemValues.has(c.item.id.toString())
  )
  if (uncalledMarks.length > 0) {
    const uncalledValues = uncalledMarks.map((c) => c.item.value).join(", ")
    return {
      valid: false,
      reason: `Some marked items haven't been called yet: ${uncalledValues}`,
      claimedCells,
    }
  }

  // All checks passed!
  return {
    valid: true,
    reason: `Valid ${claimType.replace("_", " ")}${claimIndex !== undefined ? ` #${claimIndex + 1}` : ""} claim!`,
    claimedCells,
  }
}

/**
 * Check if a player has already made a claim of this type for this game.
 * Used to prevent duplicate claims.
 */
export function isDuplicateClaim(
  existingClaims: Array<{ claim_type: string; player_id: string; status: string; claim_data?: any }>,
  playerId: string,
  claimType: ClaimType,
  claimIndex?: number
): boolean {
  return existingClaims.some(
    (c) =>
      c.player_id === playerId &&
      c.claim_type === claimType &&
      c.status === "approved"
  )
}

export const CLAIM_DISPLAY_INFO: Record<ClaimType, { label: string; icon: string }> = {
  early_five: { label: "Early Five", icon: "🏆" },
  top_row: { label: "Top Line", icon: "⬆️" },
  middle_row: { label: "Middle Line", icon: "➡️" },
  bottom_row: { label: "Bottom Line", icon: "⬇️" },
  corners: { label: "Four Corners", icon: "⭐" },
  full_house: { label: "Full House", icon: "🏅" },
  row: { label: "Row", icon: "➡️" },
  column: { label: "Column", icon: "⬇️" },
  diagonal: { label: "Diagonal", icon: "⭐" },
}


