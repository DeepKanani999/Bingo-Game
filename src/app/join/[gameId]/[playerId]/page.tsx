"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

/**
 * Redirector for individual player join links.
 * Redirects from /join/[gameId]/[playerId] to the active /play/[gameId]/[playerId] route.
 */
export default function JoinRedirectPage() {
  const params = useParams()
  const gameId = params.gameId as string
  const playerId = params.playerId as string
  const router = useRouter()

  useEffect(() => {
    if (gameId && playerId) {
      router.replace(`/play/${gameId}/${playerId}`)
    } else {
      router.replace("/")
    }
  }, [gameId, playerId, router])

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground animate-pulse">Entering game session...</p>
    </div>
  )
}
