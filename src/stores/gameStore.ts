import { create } from "zustand"
import type { TicketSize } from "@/lib/bingo-utils"

// ============================================================
// Game Store — Full game state management
// ============================================================

export type GameType = "number" | "bollywood" | "custom"
export type GameStatus = "lobby" | "active" | "paused" | "ended"

export interface GamePlayer {
  id: string
  name: string
  joinToken: string
  joinedAt: Date
  markedCount: number
  rowsCompleted: number
  hasBingo: boolean
  isReady: boolean
}

export interface CalledItem {
  id: string
  value: string
  callOrder: number
  calledAt: Date
  movieName?: string
  imageUrl?: string
  dialogueText?: string
}

export interface GameClaim {
  id: string
  playerId: string
  playerName: string
  claimType: string
  isValid: boolean | null
  reason: string
  status: string
  createdAt: Date
}

export interface GameState {
  // Identity
  gameId: string | null
  gameCode: string | null
  hostSecret: string | null
  
  // Config
  gameName: string
  hostName: string
  gameType: GameType | null
  ticketSize: TicketSize
  numberRange: number | null
  datasetSize: number | null
  maxPlayers: number
  autoCall: boolean
  callInterval: number
  
  // Runtime
  status: GameStatus | null
  paused: boolean
  autoCallActive: boolean
  players: GamePlayer[]
  calledItems: CalledItem[]
  claims: GameClaim[]
  createdAt: Date | null
}

interface GameStoreActions {
  setGame: (updates: Partial<GameState>) => void
  addCalledItem: (item: CalledItem) => void
  removeCalledItem: (itemId: string) => void
  updatePlayer: (playerId: string, updates: Partial<GamePlayer>) => void
  addPlayer: (player: GamePlayer) => void
  removePlayer: (playerId: string) => void
  addClaim: (claim: GameClaim) => void
  updateClaim: (claimId: string, updates: Partial<GameClaim>) => void
  setAutoCallActive: (active: boolean) => void
  setPaused: (paused: boolean) => void
  resetGame: () => void
  endGame: () => void
}

const initialState: GameState = {
  gameId: null,
  gameCode: null,
  hostSecret: null,
  gameName: "Bingo Game",
  hostName: "Host",
  gameType: null,
  ticketSize: "5x5",
  numberRange: null,
  datasetSize: null,
  maxPlayers: 20,
  autoCall: false,
  callInterval: 10,
  status: null,
  paused: false,
  autoCallActive: false,
  players: [],
  calledItems: [],
  claims: [],
  createdAt: null,
}

export const useGameStore = create<GameState & GameStoreActions>((set) => ({
  ...initialState,
  
  setGame: (updates) =>
    set((state) => ({ ...state, ...updates })),
  
  addCalledItem: (item) =>
    set((state) => ({
      calledItems: [...state.calledItems, item],
    })),
  
  removeCalledItem: (itemId) =>
    set((state) => ({
      calledItems: state.calledItems.filter((i) => i.id !== itemId),
    })),
  
  updatePlayer: (playerId, updates) =>
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, ...updates } : p
      ),
    })),
  
  addPlayer: (player) =>
    set((state) => ({
      players: [...state.players, player],
    })),
  
  removePlayer: (playerId) =>
    set((state) => ({
      players: state.players.filter((p) => p.id !== playerId),
    })),
  
  addClaim: (claim) =>
    set((state) => ({
      claims: [...state.claims, claim],
    })),
  
  updateClaim: (claimId, updates) =>
    set((state) => ({
      claims: state.claims.map((c) =>
        c.id === claimId ? { ...c, ...updates } : c
      ),
    })),
  
  setAutoCallActive: (active) =>
    set({ autoCallActive: active }),
  
  setPaused: (paused) =>
    set({ paused }),
  
  resetGame: () => set(initialState),
  
  endGame: () =>
    set((state) => ({ ...state, status: "ended" as GameStatus })),
}))
