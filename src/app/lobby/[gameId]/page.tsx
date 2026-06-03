"use client"

import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Users, Clock, Copy, Share2, LogOut, Loader2, Link2, Hash, Zap, Play, Edit3 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { subscribeToGame } from "@/lib/realtime"

const getAvatarGradient = (name: string = "") => {
  const colors = [
    "from-blue-500 to-cyan-500",
    "from-purple-500 to-pink-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-rose-500 to-red-500",
    "from-indigo-500 to-violet-500",
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % colors.length
  return colors[index]
}

const getJoinedAgo = (createdAt: string) => {
  if (!createdAt) return "just now"
  const diffMs = Date.now() - new Date(createdAt).getTime()
  if (isNaN(diffMs)) return "just now"
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return "just now"
  if (diffMins === 1) return "1 min ago"
  if (diffMins < 60) return `${diffMins} mins ago`
  const diffHrs = Math.floor(diffMins / 60)
  return `${diffHrs}h ago`
}

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
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#2563EB] mb-4" />
        <p className="text-slate-500 font-medium">Joining lobby...</p>
      </div>
    )
  }

  const gameType = gameData?.game_type || "number"

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 relative overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500">
        {/* Lobby Header / Hero */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white border border-slate-200/60 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="px-2.5 py-1 font-bold tracking-wider text-xs uppercase bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE] rounded-full">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-ping" />
                Lobby Waiting
              </Badge>
              <Badge variant="secondary" className="px-2.5 py-1 text-xs font-semibold capitalize bg-slate-100 text-slate-700 rounded-full">
                {gameType} Mode
              </Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900">
              {gameData?.game_name}
            </h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-slate-500 font-medium">
              <span>Hosted by <span className="text-slate-900 font-semibold">{gameData?.host_name}</span></span>
              {myName && (
                <>
                  <span className="hidden sm:inline text-slate-300">•</span>
                  <span className="text-[#2563EB] font-bold">You joined as: {myName}</span>
                </>
              )}
            </div>
          </div>

          {/* Game Code & Share */}
          <div className="flex flex-col sm:flex-row items-stretch gap-4 lg:min-w-[400px]">
            <div className="flex-1 bg-white border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center relative group hover:border-[#2563EB]/40 transition-all duration-300">
              <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Game Code</p>
              <button onClick={() => {
                navigator.clipboard.writeText(gameData?.game_code || "")
                toast.success("Game code copied!")
              }} className="text-3xl font-black font-mono tracking-widest text-[#2563EB] flex items-center gap-2 hover:scale-105 transition-transform">
                {gameData?.game_code}
                <Copy className="w-4 h-4 text-slate-400 group-hover:text-[#2563EB] transition-colors" />
              </button>
              <span className="text-[9px] text-slate-400 mt-1 opacity-60">Click code to copy</span>
            </div>

            <div className="flex flex-col justify-center gap-2 sm:w-48">
              <Button variant="outline" size="sm" onClick={shareWhatsApp} className="w-full flex items-center justify-center gap-2 text-xs font-bold py-2.5 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl">
                <Share2 className="w-3.5 h-3.5" />
                WhatsApp Invite
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                if (typeof window !== "undefined") {
                  const link = `${window.location.origin}/join/${gameData?.game_code}`
                  navigator.clipboard.writeText(link)
                  toast.success("Invite link copied!")
                }
              }} className="w-full flex items-center justify-center gap-2 text-xs font-bold py-2.5 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl">
                <Link2 className="w-3.5 h-3.5" />
                Copy Invite Link
              </Button>
            </div>
          </div>
        </div>

        {/* Game Config cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/60 rounded-xl p-4 flex items-center gap-3 shadow-sm">
            <div className="p-2.5 rounded-lg bg-blue-50 text-[#2563EB]">
              {gameType === "number" ? <Hash className="w-5 h-5" /> : gameType === "bollywood" ? <Play className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Game Type</p>
              <p className="font-extrabold text-sm capitalize text-slate-800">{gameType}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/60 rounded-xl p-4 flex items-center gap-3 shadow-sm">
            <div className="p-2.5 rounded-lg bg-blue-50 text-[#2563EB]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Ticket Grid</p>
              <p className="font-extrabold text-sm text-slate-800">{gameData?.ticket_size || "5x5"}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/60 rounded-xl p-4 flex items-center gap-3 shadow-sm">
            <div className="p-2.5 rounded-lg bg-blue-50 text-[#2563EB]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Calling Mode</p>
              <p className="font-extrabold text-sm text-slate-800 truncate max-w-[120px]">
                {gameData?.auto_call ? `Auto (${gameData?.call_interval}s)` : "Manual"}
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/60 rounded-xl p-4 flex items-center gap-3 shadow-sm">
            <div className="p-2.5 rounded-lg bg-blue-50 text-[#2563EB]">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Items</p>
              <p className="font-extrabold text-sm text-slate-800">
                {gameType === "number" ? `1–${gameData?.number_range || 90}` : gameType === "bollywood" ? `Bollywood` : "Custom"}
              </p>
            </div>
          </div>
        </div>

        {/* Players Grid Section */}
        <Card className="border border-slate-200/60 bg-white shadow-sm rounded-2xl">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                  <Users className="w-5 h-5 text-slate-400" />
                  Lobby Waiting Room
                </CardTitle>
                <CardDescription>Players will appear here in real-time as they join.</CardDescription>
              </div>
              
              <div className="space-y-1.5 sm:w-64">
                <div className="flex justify-between text-xs font-semibold text-slate-600">
                  <span>Joined Capacity</span>
                  <span className="text-[#2563EB]">{players.length} / {gameData?.max_players || 20}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
                  <div className="h-full bg-[#2563EB] transition-all duration-500 ease-out" style={{ width: `${Math.min(100, (players.length / (gameData?.max_players || 20)) * 100)}%` }} />
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-2">
            {players.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold mb-1 text-slate-800">Your waiting room is empty</h3>
                <p className="text-sm text-slate-400 max-w-sm mb-6">
                  Share the game code or invite link with players so they can join the game.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {players.map((p: any) => (
                  <div 
                    key={p.id} 
                    className="bg-white border border-slate-200/60 hover:border-[#2563EB]/30 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all duration-300 hover:shadow-md relative group overflow-hidden"
                  >
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarGradient(p.display_name)} flex items-center justify-center text-lg font-black text-white shadow-sm mb-2.5`}>
                      {p.display_name?.[0]?.toUpperCase()}
                    </div>
                    <span className="font-bold text-sm text-slate-800 truncate w-full px-1">{p.display_name}</span>
                    <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1 mt-1 w-full truncate">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      {getJoinedAgo(p.created_at)}
                    </span>
                    {p.id === playerId && (
                      <Badge className="text-[8px] absolute top-2 right-2 bg-blue-50 text-[#2563EB] hover:bg-blue-100 border border-blue-200 px-1 py-0 rounded">YOU</Badge>
                    )}
                  </div>
                ))}
                
                {/* Render empty placeholder slots up to 12 slots max to avoid page bloat */}
                {Array.from({ length: Math.max(0, Math.min(gameData?.max_players || 20, 12) - players.length) }).map((_, idx) => (
                  <div 
                    key={`empty-${idx}`} 
                    className="border-2 border-dashed border-slate-100 bg-slate-50/30 rounded-2xl p-4 flex flex-col items-center justify-center text-center h-[116px] animate-pulse"
                  >
                    <div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-200 mb-2">
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-300">Waiting...</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Player Status & Actions Panel */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 animate-pulse">
              <Clock className="w-6 h-6 text-[#2563EB]" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-lg text-slate-800">Waiting for Host to start...</h3>
              <p className="text-sm text-slate-500">
                The host will start the game shortly. Once started, your dashboard and ticket will load automatically.
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
            <Button 
              variant="outline" 
              onClick={handleLeave} 
              className="font-bold border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-12 px-6 rounded-xl"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Leave Lobby
            </Button>
            <Button 
              onClick={shareWhatsApp} 
              className="font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] h-12 px-6 rounded-xl shadow-sm"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Invite Friends
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
