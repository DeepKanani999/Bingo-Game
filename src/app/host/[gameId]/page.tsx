"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

/**
 * Gatekeeper for the Host Dashboard.
 * Requirements: Host must have a secret key to access control features.
 * This page redirects to the secure /host/[gameId]/[secretKey] route.
 */
export default function HostGatekeeperPage() {
  const params = useParams()
  const gameId = params.gameId as string
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (!gameId) return

    // 1. Check localStorage for a stored secret for this game
    const storedSecret = localStorage.getItem(`hostSecret_${gameId}`)
    
    // 2. Fallback: check lastHostedGameId if it matches this gameId
    const lastHostedId = localStorage.getItem("lastHostedGameId")
    const lastSecret = lastHostedId === gameId ? localStorage.getItem(`hostSecret_${lastHostedId}`) : null

    const secret = storedSecret || lastSecret

    if (secret) {
      // Authorized! Redirect to the secure dashboard
      router.replace(`/host/${gameId}/${secret}`)
    } else {
      // Unauthorized or session lost
      toast.error("Host session not found. Please create a new game or use the host link.")
      router.replace("/")
    }
    
    setIsChecking(false)
  }, [gameId, router])

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
      <h1 className="text-xl font-bold mb-2">Verifying Host Session</h1>
      <p className="text-muted-foreground text-sm text-center max-w-xs">
        Connecting to your secure dashboard...
      </p>
    </div>
  )
}
