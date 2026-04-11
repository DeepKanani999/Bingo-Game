"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, ArrowLeft, Gamepad2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function JoinGameByCodePage() {
  const params = useParams()
  const gameId = params.gameId as string
  const router = useRouter()
  
  const [playerName, setPlayerName] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const [gameInfo, setGameInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchGame = async () => {
      try {
        const { data: game, error } = await supabase
          .from("games")
          .select("*")
          .eq("game_code", gameId.toUpperCase())
          .single()

        if (error || !game) {
          toast.error("Invalid game code")
          router.push("/")
          return
        }

        if (game.status === "ended") {
          toast.error("This game has already ended")
          router.push("/")
          return
        }

        setGameInfo(game)
      } catch (error) {
        console.error("Error fetching game:", error)
        router.push("/")
      } finally {
        setIsLoading(false)
      }
    }

    if (gameId) {
      fetchGame()
    }
  }, [gameId, router])

  const handleJoin = async () => {
    if (!playerName.trim()) {
      toast.error("Please enter your name")
      return
    }

    setIsJoining(true)
    try {
      // Double check player count
      const { count } = await supabase
        .from("players")
        .select("*", { count: "exact", head: true })
        .eq("game_id", gameInfo.id)

      if (count !== null && count >= (gameInfo.max_players || 20)) {
        toast.error("This game is full!")
        setIsJoining(false)
        return
      }

      const playerId = crypto.randomUUID()
      const joinToken = crypto.randomUUID()

      const { error: playerError } = await supabase.from("players").insert({
        id: playerId,
        game_id: gameInfo.id,
        join_token: joinToken,
        display_name: playerName.trim(),
      })

      if (playerError) throw playerError

      localStorage.setItem("activeGameId", gameInfo.id)
      localStorage.setItem("activePlayerId", playerId)
      localStorage.setItem("activePlayerName", playerName.trim())

      toast.success("Joined successfully!")
      
      if (gameInfo.status === "active") {
        router.push(`/play/${gameInfo.id}/${playerId}`)
      } else {
        router.push(`/lobby/${gameInfo.id}?player=${playerId}`)
      }
    } catch (error) {
      console.error("Join error:", error)
      toast.error("Failed to join game")
    } finally {
      setIsJoining(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Fetching game details...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        <Card className="border-2 border-primary/10 shadow-xl overflow-hidden">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Gamepad2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-black">Join Game</CardTitle>
            <CardDescription>
              Enter your name to join <span className="text-foreground font-bold">{gameInfo?.game_name}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="p-3 bg-muted/50 rounded-xl text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Game Code</p>
              <p className="text-xl font-black tracking-[0.2em] text-primary">{gameId.toUpperCase()}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Your Display Name</label>
              <Input
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                className="h-12 rounded-xl text-base"
                maxLength={20}
                autoFocus
              />
            </div>

            <Button
              className="w-full h-14 rounded-xl font-bold text-lg shadow-lg shadow-primary/20"
              onClick={handleJoin}
              disabled={isJoining || !playerName.trim()}
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Joining...
                </>
              ) : (
                "Join Game"
              )}
            </Button>
            
            <div className="flex justify-center gap-4 text-xs text-muted-foreground mt-2">
              <span className="flex items-center gap-1">• {gameInfo?.game_type} mode</span>
              <span className="flex items-center gap-1">• {gameInfo?.ticket_size} grid</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
