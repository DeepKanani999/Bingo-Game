import { create } from "zustand"
import type { BoardCell, WinningLine, TicketSize } from "@/lib/bingo-utils"

// ============================================================
// Player Store — Player-side state management
// ============================================================

export interface PlayerState {
  // Identity
  playerId: string | null
  playerName: string | null
  joinToken: string | null
  gameId: string | null
  
  // Board
  board: BoardCell[]
  ticketSize: TicketSize
  markedItemIds: Set<string>
  
  // Game state
  winningLines: WinningLine[]
  hasBingo: boolean
  rowsCompleted: number[]
  lastCalledItemId: string | null
  lastCalledValue: string | null
  isReady: boolean
  
  // Claims
  pendingClaim: string | null // claim type being submitted
  claimResults: Array<{
    type: string
    valid: boolean
    reason: string
    timestamp: Date
  }>
}

interface PlayerStoreActions {
  setPlayerIdentity: (playerId: string, playerName: string, joinToken: string, gameId: string) => void
  setBoardData: (board: BoardCell[], markedItemIds: string[], ticketSize?: TicketSize) => void
  markCell: (itemId: string) => void
  unmarkCell: (itemId: string) => void
  setWinningLines: (lines: WinningLine[]) => void
  setRowsCompleted: (rows: number[]) => void
  setHasBingo: (value: boolean) => void
  setLastCalledItem: (itemId: string | null, value?: string | null) => void
  setIsReady: (ready: boolean) => void
  setPendingClaim: (claimType: string | null) => void
  addClaimResult: (result: { type: string; valid: boolean; reason: string }) => void
  resetPlayer: () => void
}

const initialState: PlayerState = {
  playerId: null,
  playerName: null,
  joinToken: null,
  gameId: null,
  board: [],
  ticketSize: "5x5",
  markedItemIds: new Set(),
  winningLines: [],
  hasBingo: false,
  rowsCompleted: [],
  lastCalledItemId: null,
  lastCalledValue: null,
  isReady: false,
  pendingClaim: null,
  claimResults: [],
}

export const usePlayerStore = create<PlayerState & PlayerStoreActions>((set) => ({
  ...initialState,
  
  setPlayerIdentity: (playerId, playerName, joinToken, gameId) =>
    set({ playerId, playerName, joinToken, gameId }),
  
  setBoardData: (board, markedItemIds, ticketSize) =>
    set({
      board,
      markedItemIds: new Set(markedItemIds),
      ...(ticketSize ? { ticketSize } : {}),
    }),
  
  markCell: (itemId) =>
    set((state) => {
      const newMarked = new Set(state.markedItemIds)
      newMarked.add(itemId)
      return { markedItemIds: newMarked }
    }),
  
  unmarkCell: (itemId) =>
    set((state) => {
      const newMarked = new Set(state.markedItemIds)
      newMarked.delete(itemId)
      return { markedItemIds: newMarked }
    }),
  
  setWinningLines: (lines) => set({ winningLines: lines }),
  setRowsCompleted: (rows) => set({ rowsCompleted: rows }),
  setHasBingo: (value) => set({ hasBingo: value }),
  
  setLastCalledItem: (itemId, value) =>
    set({ lastCalledItemId: itemId, lastCalledValue: value || null }),
  
  setIsReady: (ready) => set({ isReady: ready }),
  setPendingClaim: (claimType) => set({ pendingClaim: claimType }),
  
  addClaimResult: (result) =>
    set((state) => ({
      claimResults: [...state.claimResults, { ...result, timestamp: new Date() }],
      pendingClaim: null,
    })),
  
  resetPlayer: () => set(initialState),
}))
