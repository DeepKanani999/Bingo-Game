"use client"

import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Users, Clock, Copy, Share2, LogOut, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { subscribeToGame } from "@/lib/realtime"

export default function PlayerLobbyPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const gameId = params.gameId as string
  const playerId = searchParams.get("player")
  const router = useRouter()

  const [gameData, setGameData] = useState<any>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [myName, setMyName] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: game, error } = await supabase.from("games").select("*").eq("id", gameId).single()
        if (error) throw error
        setGameData(game)

        if (game.status === "active" && playerId) {
          router.push(`/play/${gameId}/${playerId}`)
          return
        }
        if (game.status === "ended") {
          toast.error("Game has ended")
          router.push("/")
          return
        }

        const { data: pData } = await supabase.from("players").select("*").eq("game_id", gameId)
        setPlayers(pData || [])

        if (playerId) {
          const me = pData?.find((p: any) => p.id === playerId)
          if (me) setMyName(me.display_name)
        }
      } catch {
        toast.error("Failed to load lobby")
        router.push("/")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()

    const sub = subscribeToGame(gameId, {
      onPlayerJoined: async () => {
        const { data } = await supabase.from("players").select("*").eq("game_id", gameId)
        setPlayers(data || [])
      },
      onGameStatusChanged: (payload) => {
        const newStatus = payload.new?.status
        if (newStatus === "active" && playerId) {
          toast.success("Game starting!")
          router.push(`/play/${gameId}/${playerId}`)
        }
        if (newStatus === "ended") {
          toast.error("Game ended by host")
          router.push("/")
        }
        setGameData((prev: any) => ({ ...prev, ...payload.new }))
      },
    })

    return () => sub.unsubscribe()
  }, [gameId, playerId, router])

  const handleLeave = async () => {
    if (playerId) {
      await supabase.from("players").delete().eq("id", playerId)
      localStorage.removeItem("activeGameId")
      localStorage.removeItem("activePlayerId")
    }
    router.push("/")
  }

  const shareWhatsApp = () => {
    const code = gameData?.game_code || ""
    const msg = `🎲 Join my Bingo game!\n\nGame: ${gameData?.game_name}\nCode: ${code}\n\nOpen the app and join!`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Joining lobby...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Game Info */}
        <div className="text-center py-6">
          <Badge variant="outline" className="mb-4 text-xs">WAITING ROOM</Badge>
          <h1 className="text-3xl font-extrabold mb-2">{gameData?.game_name}</h1>
          <p className="text-muted-foreground text-sm">
            Hosted by <span className="font-semibold text-foreground">{gameData?.host_name}</span>
          </p>
          {myName && (
            <p className="text-xs text-primary mt-1">You joined as: <span className="font-bold">{myName}</span></p>
          )}
        </div>

        {/* Waiting animation */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
          <CardContent className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Clock className="w-12 h-12 text-primary animate-pulse" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-ping" />
              </div>
            </div>
            <p className="text-lg font-bold mb-1">Waiting for host to start...</p>
            <p className="text-sm text-muted-foreground">You'll be redirected automatically</p>
          </CardContent>
        </Card>

        {/* Game Details */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Type</p>
              <p className="font-bold text-sm capitalize">{gameData?.game_type}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Grid</p>
              <p className="font-bold text-sm">{gameData?.ticket_size || "5x5"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Code</p>
              <button onClick={() => {
                navigator.clipboard.writeText(gameData?.game_code || "")
                toast.success("Copied!")
              }} className="font-bold text-sm text-primary flex items-center justify-center gap-1 mx-auto">
                {gameData?.game_code}<Copy className="w-3 h-3" />
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Players */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Players ({players.length}/{gameData?.max_players || 20})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {players.map((p: any) => (
                <div key={p.id} className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm ${
                  p.id === playerId ? "border-primary/40 bg-primary/5" : "bg-muted/20"
                }`}>
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {p.display_name?.[0]?.toUpperCase()}
                  </div>
                  <span className="truncate font-medium">{p.display_name}</span>
                  {p.id === playerId && <Badge className="text-[8px] ml-auto">YOU</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={shareWhatsApp} className="flex-1">
            <Share2 className="w-4 h-4 mr-2" />Invite Friends
          </Button>
          <Button variant="destructive" onClick={handleLeave}>
            <LogOut className="w-4 h-4 mr-1" />Leave
          </Button>
        </div>
      </div>
    </div>
  )
}
