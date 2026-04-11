// ============================================================
// Realtime Manager — Centralized Supabase Realtime subscriptions
// Handles auto-reconnect and clean teardown
// ============================================================

import { supabase } from "./supabase"
import type { RealtimeChannel } from "@supabase/supabase-js"

export type RealtimeEvent =
  | "number_called"
  | "player_joined"
  | "player_left"
  | "player_marked"
  | "claim_submitted"
  | "claim_result"
  | "game_status_changed"
  | "game_settings_changed"

export interface RealtimeSubscription {
  channel: RealtimeChannel
  unsubscribe: () => void
}

/**
 * Subscribe to all game events for a specific game.
 * Returns an object with the channel and cleanup function.
 */
export function subscribeToGame(
  gameId: string,
  callbacks: {
    onNumberCalled?: (payload: any) => void
    onPlayerJoined?: (payload: any) => void
    onPlayerLeft?: (payload: any) => void
    onPlayerMarked?: (payload: any) => void
    onClaimSubmitted?: (payload: any) => void
    onClaimResult?: (payload: any) => void
    onGameStatusChanged?: (payload: any) => void
  }
): RealtimeSubscription {
  const channel = supabase.channel(`game-${gameId}`)

  // Called items (new numbers/items called)
  if (callbacks.onNumberCalled) {
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "called_items",
        filter: `game_id=eq.${gameId}`,
      },
      callbacks.onNumberCalled
    )
  }

  // Players joining/leaving/updating
  if (callbacks.onPlayerJoined) {
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "players",
        filter: `game_id=eq.${gameId}`,
      },
      callbacks.onPlayerJoined
    )
  }

  if (callbacks.onPlayerLeft) {
    channel.on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "players",
        filter: `game_id=eq.${gameId}`,
      },
      callbacks.onPlayerLeft
    )
  }

  // Player marks
  if (callbacks.onPlayerMarked) {
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "player_marks",
      },
      callbacks.onPlayerMarked
    )
  }

  // Claims
  if (callbacks.onClaimSubmitted) {
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "claims",
        filter: `game_id=eq.${gameId}`,
      },
      callbacks.onClaimSubmitted
    )
  }

  if (callbacks.onClaimResult) {
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "claims",
        filter: `game_id=eq.${gameId}`,
      },
      callbacks.onClaimResult
    )
  }

  // Game status changes
  if (callbacks.onGameStatusChanged) {
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "games",
        filter: `id=eq.${gameId}`,
      },
      callbacks.onGameStatusChanged
    )
  }

  channel.subscribe()

  return {
    channel,
    unsubscribe: () => {
      supabase.removeChannel(channel)
    },
  }
}

/**
 * Subscribe to host-specific events (more detailed player tracking).
 */
export function subscribeToHostEvents(
  gameId: string,
  callbacks: {
    onPlayerMarked?: (payload: any) => void
    onClaimSubmitted?: (payload: any) => void
    onPlayerJoined?: (payload: any) => void
  }
): RealtimeSubscription {
  const channel = supabase.channel(`host-${gameId}`)

  if (callbacks.onPlayerMarked) {
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "player_marks" },
      callbacks.onPlayerMarked
    )
  }

  if (callbacks.onClaimSubmitted) {
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "claims",
        filter: `game_id=eq.${gameId}`,
      },
      callbacks.onClaimSubmitted
    )
  }

  if (callbacks.onPlayerJoined) {
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "players",
        filter: `game_id=eq.${gameId}`,
      },
      callbacks.onPlayerJoined
    )
  }

  channel.subscribe()

  return {
    channel,
    unsubscribe: () => {
      supabase.removeChannel(channel)
    },
  }
}

/**
 * Generate a short 6-character game code.
 */
export function generateGameCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // No I, O, 0, 1 to avoid confusion
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
