"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Play, Pause, RotateCcw, LogOut, Edit3, Trash2, Copy, Users, Clock,
  Volume2, VolumeX, Share2, ChevronLeft, Hash, Check, X, Zap, ShieldCheck,
  ChevronDown, ChevronUp, Link2, Loader2, Sparkles,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { CLAIM_DISPLAY_INFO } from "@/lib/claim-validator"
import { generateNumberPool, shuffleArray } from "@/lib/bingo-utils"
import { getBollywoodItemByTitle } from "@/lib/bollywood-data"
import { subscribeToHostEvents } from "@/lib/realtime"

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

export default function HostDashboardPage() {
  const params = useParams()
  const gameId = params.gameId as string
  const secretKey = params.secretKey as string
  const router = useRouter()

  const [gameData, setGameData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [currentItem, setCurrentItem] = useState<any>(null)
  const [calledItems, setCalledItems] = useState<any[]>([])
  const [players, setPlayers] = useState<any[]>([])
  const [claims, setClaims] = useState<any[]>([])
  const [bollywoodMappings, setBollywoodMappings] = useState<any[]>([])
  const [itemPool, setItemPool] = useState<string[]>([])
  const [showEndDialog, setShowEndDialog] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [editValue, setEditValue] = useState("")
  const [manualNumber, setManualNumber] = useState("")
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [autoCallActive, setAutoCallActive] = useState(false)
  const autoCallRef = useRef<NodeJS.Timeout | null>(null)
  const [isBollywoodExpanded, setIsBollywoodExpanded] = useState(false)

  const [localPrizes, setLocalPrizes] = useState<Record<string, string>>({
    early_five: "",
    top_row: "",
    middle_row: "",
    bottom_row: "",
    corners: "",
    full_house: "",
  })
  const [isSavingPrizes, setIsSavingPrizes] = useState(false)
  const [showPrizesDialog, setShowPrizesDialog] = useState(false)

  useEffect(() => {
    const savedPrizes = typeof window !== "undefined" ? localStorage.getItem(`prizes_${gameId}`) : null
    const prizesObj = gameData?.prizes || (savedPrizes ? JSON.parse(savedPrizes) : {})
    
    setLocalPrizes({
      early_five: prizesObj.early_five || "",
      top_row: prizesObj.top_row || "",
      middle_row: prizesObj.middle_row || "",
      bottom_row: prizesObj.bottom_row || "",
      corners: prizesObj.corners || "",
      full_house: prizesObj.full_house || "",
    })
  }, [gameData, gameId])

  // ============ Auth Check ============
  useEffect(() => {
    if (!gameId || !secretKey) return
    const verify = async () => {
      const { data, error } = await supabase
        .from("games")
        .select("host_secret")
        .eq("id", gameId)
        .single()

      if (error || !data || data.host_secret !== secretKey) {
        toast.error("Invalid host access")
        router.push("/")
        return
      }
      setIsAuthorized(true)
    }
    verify()
  }, [gameId, secretKey, router])

  // ============ Load Game Data ============
  const loadGameData = useCallback(async () => {
    try {
      const { data: gData, error: gameError } = await supabase.from("games").select("*").eq("id", gameId).single()
      if (gameError) throw gameError
      setGameData(gData)
      setIsPaused(gData.paused || false)

      const { data: pData } = await supabase.from("players").select("*").eq("game_id", gameId)
      setPlayers(pData || [])

      const { data: cData } = await supabase.from("called_items").select("*").eq("game_id", gameId).order("call_order", { ascending: true })
      const formatted = cData?.map((i: any) => ({ id: i.id, value: i.item_id, callOrder: i.call_order })) || []
      setCalledItems(formatted)
      if (formatted.length > 0) setCurrentItem(formatted[formatted.length - 1])

      const { data: claimsData } = await supabase.from("claims").select("*, players(display_name)").eq("game_id", gameId).order("created_at", { ascending: false })
      setClaims(claimsData || [])

      if (gData.game_type === "bollywood") {
        const { data: mappingData } = await supabase
          .from("bollywood_mappings")
          .select("*")
          .eq("game_id", gameId)
          .order("number", { ascending: true })
        setBollywoodMappings(mappingData || [])
      } else {
        setBollywoodMappings([])
      }

      // Build remaining pool
      let fullPool: string[] = []
      if (gData.game_type === "number") {
        fullPool = generateNumberPool(gData.number_range || 90)
      } else {
        const range = gData.number_range || 90
        fullPool = generateNumberPool(range)
      }
      const calledSet = new Set(formatted.map((c: any) => c.value))
      setItemPool(fullPool.filter((v) => !calledSet.has(v)))
    } catch (error) {
      toast.error("Failed to load dashboard")
      router.push("/")
    } finally {
      setIsLoading(false)
    }
  }, [gameId, router])

  useEffect(() => {
    if (!isAuthorized) return
    loadGameData()

    const sub = subscribeToHostEvents(gameId, {
      onPlayerJoined: () => loadGameData(),
      onClaimSubmitted: () => loadGameData(),
      onPlayerMarked: () => {},
    })

    return () => sub.unsubscribe()
  }, [isAuthorized, loadGameData, gameId])

  // ============ Auto-Call Timer ============
  useEffect(() => {
    if (autoCallActive && gameData?.auto_call && !isPaused && gameData?.status === "active") {
      const interval = (gameData.call_interval || 10) * 1000
      autoCallRef.current = setInterval(() => {
        handleCallNext()
      }, interval)
    }
    return () => {
      if (autoCallRef.current) clearInterval(autoCallRef.current)
    }
  }, [autoCallActive, isPaused, gameData?.status, itemPool.length])

  // ============ Voice ============
  const speak = (text: string) => {
    if (!voiceEnabled || typeof window === "undefined") return
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1.1
    speechSynthesis.speak(utterance)
  }

  // ============ Actions ============
  const handleCallNext = async () => {
    if (gameData?.status === "lobby") {
      toast.error("Please start the game first!")
      return
    }
    if (itemPool.length === 0) {
      toast.error("All items called!")
      if (autoCallRef.current) clearInterval(autoCallRef.current)
      return
    }
    
    // ... rest of logic

    const randomIdx = Math.floor(Math.random() * itemPool.length)
    const nextItem = itemPool[randomIdx]
    const order = calledItems.length + 1

    try {
      const { data, error } = await supabase.from("called_items")
        .insert({ game_id: gameId, item_id: nextItem, call_order: order })
        .select().single()
      if (error) throw error

      const newItem = { id: data.id, value: nextItem, callOrder: order }
      setCalledItems((prev) => [...prev, newItem])
      setCurrentItem(newItem)
      setItemPool((prev) => prev.filter((_, i) => i !== randomIdx))
      speak(`Number ${nextItem}`)
    } catch { toast.error("Failed to call") }
  }

  const handleManualCall = async () => {
    if (!manualNumber.trim()) return
    const val = manualNumber.trim()
    if (calledItems.some((c) => c.value === val)) {
      toast.error("Already called!")
      return
    }
    const order = calledItems.length + 1
    try {
      const { data, error } = await supabase.from("called_items")
        .insert({ game_id: gameId, item_id: val, call_order: order })
        .select().single()
      if (error) throw error

      const newItem = { id: data.id, value: val, callOrder: order }
      setCalledItems((prev) => [...prev, newItem])
      setCurrentItem(newItem)
      setItemPool((prev) => prev.filter((v) => v !== val))
      setManualNumber("")
      speak(`Number ${val}`)
    } catch { toast.error("Failed to call") }
  }

  const handleEndGame = async () => {
    try {
      await supabase.from("games").update({ status: "ended" }).eq("id", gameId)
      setGameData((prev: any) => ({ ...prev, status: "ended" }))
      setShowEndDialog(false)
      toast.success("Game ended! Players can now see their scores.")
    } catch { toast.error("Failed to end game") }
  }

  const handleStartGame = async () => {
    try {
      await supabase.from("games").update({ status: "active" }).eq("id", gameId)
      setGameData((prev: any) => ({ ...prev, status: "active" }))
      toast.success("Game Started!")
    } catch { toast.error("Failed to start game") }
  }

  const handleUpdateMapping = async (id: string, name: string, dialogue: string, image_url: string) => {
    try {
      await supabase.from("bollywood_mappings").update({ movie_name: name, dialogue, image_url }).eq("id", id)
      
      const updatedItem = bollywoodMappings.find(m => m.id === id)
      if (updatedItem) {
        if (typeof window !== "undefined") {
          const savedCustom = localStorage.getItem("custom_bollywood_mappings")
          let customList = savedCustom ? JSON.parse(savedCustom) : []
          customList = customList.filter((c: any) => c.number !== updatedItem.number)
          customList.push({
            number: updatedItem.number,
            movie_name: name,
            dialogue,
            image_url
          })
          localStorage.setItem("custom_bollywood_mappings", JSON.stringify(customList))
        }
      }

      setBollywoodMappings(prev => prev.map(m => m.id === id ? { ...m, movie_name: name, dialogue, image_url } : m))
      setEditingItem(null)
      toast.success("Mapping updated")
    } catch { toast.error("Failed to update") }
  }

  const handlePauseToggle = async () => {
    const newPaused = !isPaused
    setIsPaused(newPaused)
    if (newPaused && autoCallRef.current) clearInterval(autoCallRef.current)
    if (!newPaused && gameData?.auto_call) setAutoCallActive(true)
    await supabase.from("games").update({ paused: newPaused }).eq("id", gameId)
    toast.success(newPaused ? "Game paused" : "Game resumed")
  }

  const handleDeleteItem = async (item: any) => {
    try {
      await supabase.from("called_items").delete().eq("id", item.id)
      const remaining = calledItems.filter((c) => c.id !== item.id)
      setCalledItems(remaining)
      if (currentItem?.id === item.id) setCurrentItem(remaining.length ? remaining[remaining.length - 1] : null)
      setItemPool((prev) => [...prev, item.value])
      toast.success("Item removed")
    } catch { toast.error("Failed") }
  }

  const handleRestartGame = async () => {
    try {
      await supabase.from("called_items").delete().eq("game_id", gameId)
      const pIds = players.map((p) => p.id)
      if (pIds.length) await supabase.from("player_marks").delete().in("player_id", pIds)
      await supabase.from("claims").delete().eq("game_id", gameId)
      await loadGameData()
      setShowResetDialog(false)
      toast.success("Game reset!")
    } catch { toast.error("Failed") }
  }

  const handleSavePrizes = async () => {
    setIsSavingPrizes(true)
    try {
      // 1. Try saving to Supabase
      const { error } = await supabase
        .from("games")
        .update({ prizes: localPrizes })
        .eq("id", gameId)

      // 2. Save locally as fallback
      if (typeof window !== "undefined") {
        localStorage.setItem(`prizes_${gameId}`, JSON.stringify(localPrizes))
      }

      if (error) {
        if (error.message?.includes("prizes")) {
          toast.warning("Saved locally. Run SQL to enable DB syncing.", {
            description: "ALTER TABLE games ADD COLUMN IF NOT EXISTS prizes jsonb DEFAULT '{}'::jsonb;",
            duration: 8000
          })
        } else {
          throw error
        }
      } else {
        toast.success("Prizes updated successfully!")
      }
    } catch (err: any) {
      console.error("Failed to save prizes:", err)
      toast.error("Failed to save prizes")
    } finally {
      setIsSavingPrizes(false)
    }
  }

  const copyGameCode = () => {
    if (gameData?.game_code) {
      navigator.clipboard.writeText(gameData.game_code)
      toast.success("Game code copied!")
    }
  }

  const shareWhatsApp = () => {
    const code = gameData?.game_code || gameId
    const msg = `🎲 Join my Bingo game!\n\nGame Code: ${code}\nOpen the app and enter the code to join!\n\nGame: ${gameData?.game_name}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank")
  }

  if (isLoading || !isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground animate-pulse">Loading Host Dashboard...</p>
      </div>
    )
  }

  const isActive = gameData?.status === "active"
  const currentBollywoodMapping = gameData?.game_type === "bollywood"
    ? bollywoodMappings.find((mapping) => mapping.number.toString() === currentItem?.value?.toString())
    : null
  
  // Use the verified image URL from the mapping (fallback to static set if needed)
  const currentReferenceImage = currentBollywoodMapping?.image_url || (currentBollywoodMapping?.movie_name
    ? getBollywoodItemByTitle(currentBollywoodMapping.movie_name)?.referenceImageUrl
    : null)

  const isLobby = gameData?.status === "lobby"
  const gameType = (gameData?.game_type as "number" | "bollywood" | "custom") || "number"

  const theme = {
    number: {
      accent: "blue",
      bgGradient: "from-blue-55/50 to-indigo-55/50",
      border: "border-slate-200/60",
      text: "text-[#2563EB]",
      glow: "shadow-sm",
      badgeBg: "bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]",
      btnColor: "bg-[#2563EB] hover:bg-[#1D4ED8]",
      gradientOrb: "hidden",
      accentText: "text-[#2563EB]",
      bgAccent: "bg-[#2563EB]",
    },
    bollywood: {
      accent: "amber",
      bgGradient: "from-amber-50/50 to-rose-50/50",
      border: "border-slate-200/60",
      text: "text-amber-600",
      glow: "shadow-sm",
      badgeBg: "bg-amber-50 text-amber-600 border border-amber-200",
      btnColor: "bg-[#2563EB] hover:bg-[#1D4ED8]",
      gradientOrb: "hidden",
      accentText: "text-amber-600",
      bgAccent: "bg-amber-500",
    },
    custom: {
      accent: "purple",
      bgGradient: "from-purple-50/50 to-pink-50/50",
      border: "border-slate-200/60",
      text: "text-purple-600",
      glow: "shadow-sm",
      badgeBg: "bg-purple-50 text-purple-600 border border-purple-200",
      btnColor: "bg-[#2563EB] hover:bg-[#1D4ED8]",
      gradientOrb: "hidden",
      accentText: "text-purple-600",
      bgAccent: "bg-purple-500",
    },
  }[gameType] || {
    accent: "neutral",
    bgGradient: "bg-white",
    border: "border-slate-200/60",
    text: "text-slate-700",
    glow: "shadow-sm",
    badgeBg: "bg-slate-50 text-slate-700 border border-slate-200",
    btnColor: "bg-slate-900 hover:bg-slate-800",
    gradientOrb: "hidden",
    accentText: "text-slate-900",
    bgAccent: "bg-slate-900",
  }

  const copyInviteLink = () => {
    if (typeof window !== "undefined") {
      const link = `${window.location.origin}/join/${gameData?.game_code}`
      navigator.clipboard.writeText(link)
      toast.success("Invite link copied!")
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 lg:pb-6 relative overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 space-y-8">
        {isLobby ? (
          // ==================== REDESIGNED LOBBY VIEW ====================
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Lobby Header / Hero */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-card/40 backdrop-blur-md border border-border/60 rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={`px-2.5 py-1 font-bold tracking-wider text-xs uppercase border-current ${theme.badgeBg}`}>
                    <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-ping" />
                    Lobby Waiting
                  </Badge>
                  <Badge variant="secondary" className="px-2.5 py-1 text-xs font-semibold capitalize">
                    {gameType} Mode
                  </Badge>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground">
                  {gameData?.game_name}
                </h1>
                <p className="text-muted-foreground text-sm font-medium">
                  Hosted by <span className="text-foreground font-semibold">{gameData?.host_name}</span>
                </p>
              </div>

              {/* Game Code & Share */}
              <div className="flex flex-col sm:flex-row items-stretch gap-4 lg:min-w-[400px]">
                <div className="flex-1 bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center relative group hover:border-primary/40 transition-all duration-300">
                  <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-1">Game Code</p>
                  <button onClick={copyGameCode} className="text-3xl font-black font-mono tracking-widest text-primary flex items-center gap-2 hover:scale-105 transition-transform">
                    {gameData?.game_code}
                    <Copy className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                  <span className="text-[9px] text-muted-foreground mt-1 opacity-60">Click code to copy</span>
                </div>

                <div className="flex flex-col justify-center gap-2 sm:w-48">
                  <Button variant="outline" size="sm" onClick={shareWhatsApp} className="w-full flex items-center justify-center gap-2 text-xs font-bold py-2.5">
                    <Share2 className="w-3.5 h-3.5" />
                    WhatsApp Invite
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyInviteLink} className="w-full flex items-center justify-center gap-2 text-xs font-bold py-2.5">
                    <Link2 className="w-3.5 h-3.5" />
                    Copy Invite Link
                  </Button>
                </div>
              </div>
            </div>

            {/* Game Config cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card/40 backdrop-blur-sm border border-border/60 rounded-xl p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${theme.badgeBg}`}>
                  {gameType === "number" ? <Hash className="w-5 h-5" /> : gameType === "bollywood" ? <Play className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Game Type</p>
                  <p className="font-extrabold text-sm capitalize">{gameType}</p>
                </div>
              </div>

              <div className="bg-card/40 backdrop-blur-sm border border-border/60 rounded-xl p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${theme.badgeBg}`}>
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Ticket Grid</p>
                  <p className="font-extrabold text-sm">{gameData?.ticket_size || "5x5"}</p>
                </div>
              </div>

              <div className="bg-card/40 backdrop-blur-sm border border-border/60 rounded-xl p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${theme.badgeBg}`}>
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Calling Mode</p>
                  <p className="font-extrabold text-sm truncate max-w-[120px]">
                    {gameData?.auto_call ? `Auto (${gameData?.call_interval}s)` : "Manual"}
                  </p>
                </div>
              </div>

              <div className="bg-card/40 backdrop-blur-sm border border-border/60 rounded-xl p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${theme.badgeBg}`}>
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Items</p>
                  <p className="font-extrabold text-sm">
                    {gameType === "number" ? `1–${gameData?.number_range || 90}` : gameType === "bollywood" ? `${bollywoodMappings.length} Movies` : "Custom"}
                  </p>
                </div>
              </div>
            </div>

            {/* Players Grid Section */}
            <Card className="border border-border/60 bg-card/40 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <Users className="w-5 h-5 text-muted-foreground" />
                      Lobby Waiting Room
                    </CardTitle>
                    <CardDescription>Players will appear here in real-time as they join.</CardDescription>
                  </div>
                  
                  <div className="space-y-1.5 sm:w-64">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Joined Capacity</span>
                      <span className={theme.accentText}>{players.length} / {gameData?.max_players || 20}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden border">
                      <div className={`h-full ${theme.bgAccent} transition-all duration-500 ease-out`} style={{ width: `${Math.min(100, (players.length / (gameData?.max_players || 20)) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-2">
                {players.length === 0 ? (
                  <div className="py-16 flex flex-col items-center justify-center text-center p-8">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 animate-bounce">
                      <Users className="w-8 h-8 text-muted-foreground/80" />
                    </div>
                    <h3 className="text-lg font-bold mb-1">Your waiting room is empty</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mb-6">
                      Share the game code or invite link with players so they can join the game.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                      <Button onClick={copyGameCode} size="sm" variant="secondary" className="font-bold">
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Code
                      </Button>
                      <Button onClick={shareWhatsApp} size="sm" className={`font-bold text-white ${theme.btnColor}`}>
                        <Share2 className="w-4 h-4 mr-2" />
                        Invite Friends
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {players.map((p: any) => (
                      <div 
                        key={p.id} 
                        className="bg-card border border-border/80 hover:border-primary/30 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all duration-300 hover:shadow-md relative group overflow-hidden animate-in zoom-in-95 duration-300"
                      >
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarGradient(p.display_name)} flex items-center justify-center text-lg font-black text-white shadow-sm mb-2.5`}>
                          {p.display_name?.[0]?.toUpperCase()}
                        </div>
                        <span className="font-bold text-sm text-foreground truncate w-full px-1">{p.display_name}</span>
                        <span className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 mt-1 w-full truncate">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          {getJoinedAgo(p.created_at)}
                        </span>
                      </div>
                    ))}
                    
                    {/* Render empty placeholder slots up to 12 slots max to avoid page bloat */}
                    {Array.from({ length: Math.max(0, Math.min(gameData?.max_players || 20, 12) - players.length) }).map((_, idx) => (
                      <div 
                        key={`empty-${idx}`} 
                        className="border-2 border-dashed border-muted/50 bg-muted/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center h-[116px] animate-pulse"
                      >
                        <div className="w-10 h-10 rounded-full border-2 border-dashed border-muted-foreground/10 flex items-center justify-center text-muted-foreground/20 mb-2">
                          <Users className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-muted-foreground/30">Waiting...</span>
                      </div>
                    ))}
                    
                    {/* Count card if max_players > 12 */}
                    {gameData?.max_players > 12 && gameData?.max_players - players.length > Math.max(0, 12 - players.length) && (
                      <div className="border border-border bg-muted/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center h-[116px]">
                        <span className="text-2xl font-black text-muted-foreground/50">
                          +{gameData.max_players - players.length - Math.max(0, 12 - players.length)}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground/40">More Slots</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions Panel */}
            <div className="bg-card/40 backdrop-blur-md border border-border/60 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
              <div className="space-y-1 text-center md:text-left">
                <h3 className="font-extrabold text-lg flex items-center justify-center md:justify-start gap-2">
                  Lobby Status Action
                </h3>
                <p className="text-sm text-muted-foreground">
                  {players.length === 0 
                    ? "Waiting for players to join. You need at least 1 player to start." 
                    : `Lobby is ready with ${players.length} player(s). You can now begin the call board.`}
                </p>
              </div>
              
              <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
                <Button 
                  variant="outline" 
                  onClick={() => setShowPrizesDialog(true)} 
                  className="font-bold border-amber-200/60 text-amber-605 hover:bg-amber-50"
                >
                  <Sparkles className="w-4 h-4 mr-2 text-amber-550 fill-amber-500/10" />
                  Set Prizes 🎁
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowEndDialog(true)} 
                  className="font-bold border-destructive/20 text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Cancel Game
                </Button>
                <Button 
                  size="lg" 
                  onClick={handleStartGame} 
                  disabled={players.length === 0} 
                  className={`font-black text-base px-8 py-5 h-auto text-white shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 ${
                    players.length === 0 
                      ? "bg-muted text-muted-foreground shadow-none cursor-not-allowed" 
                      : "bg-green-600 hover:bg-green-500 shadow-green-900/30 hover:shadow-green-500/20"
                  }`}
                >
                  <Play className="w-5 h-5 mr-2 fill-current animate-pulse" />
                  START GAME NOW 🚀
                </Button>
              </div>
            </div>

            {/* Bollywood Mapping expandable list */}
            {gameType === "bollywood" && (
              <Card className="border border-border bg-card/40 backdrop-blur-sm overflow-hidden">
                <button 
                  onClick={() => setIsBollywoodExpanded(!isBollywoodExpanded)}
                  className="w-full p-5 flex items-center justify-between text-left hover:bg-muted/10 transition-colors border-b border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${theme.badgeBg}`}>
                      <Play className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-lg">Bollywood Clues & Mappings</h3>
                      <p className="text-xs text-muted-foreground">Verify movie names, dialogues, and references before calling</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-bold">
                      {bollywoodMappings.length} Items
                    </Badge>
                    {isBollywoodExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                  </div>
                </button>

                {isBollywoodExpanded && (
                  <CardContent className="p-0">
                    <div className="max-h-[40vh] overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-muted/95 backdrop-blur-md z-10">
                          <tr>
                            <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground border-b w-20">#</th>
                            <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground border-b">Movie Name</th>
                            <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground border-b hidden sm:table-cell">Clue Image</th>
                            <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground border-b text-right">Edit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {bollywoodMappings.map((m) => (
                            <tr key={m.id} className="hover:bg-primary/5 transition-colors group">
                              <td className="p-4 font-mono font-bold text-primary">#{m.number}</td>
                              <td className="p-4">
                                <div className="font-bold text-base">{m.movie_name}</div>
                                {m.dialogue && <div className="text-xs text-muted-foreground italic line-clamp-1">"{m.dialogue}"</div>}
                              </td>
                              <td className="p-4 hidden sm:table-cell">
                                {m.image_url ? (
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg overflow-hidden border bg-muted/20">
                                      <img src={m.image_url} className="w-full h-full object-cover" />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">{m.image_url}</span>
                                  </div>
                                ) : (
                                  <Badge variant="destructive" className="text-[9px]">No Image</Badge>
                                )}
                              </td>
                              <td className="p-4 text-right">
                                <Button variant="ghost" size="icon" onClick={() => {
                                  setEditingItem(m)
                                  setEditValue(m.movie_name)
                                }} className="group-hover:text-primary h-8 w-8">
                                  <Edit3 className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                )}
              </Card>
            )}
          </div>
        ) : (
          // ==================== ORIGINAL ACTIVE/ENDED VIEW ====================
          <>
            {/* Header & Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white border border-slate-200/60 rounded-2xl p-6 sm:p-8 shadow-sm animate-in fade-in duration-300">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={`px-2.5 py-1 font-bold tracking-wider text-xs uppercase rounded-full ${
                    gameData?.status === "active" 
                      ? "bg-green-50 text-green-600 border border-green-200" 
                      : "bg-red-50 text-red-600 border border-red-200"
                  }`}>
                    <span className={`w-2 h-2 rounded-full mr-1.5 ${gameData?.status === "active" ? "bg-green-500 animate-ping" : "bg-red-500"}`} />
                    {gameData?.status === "active" ? "Active Call Board" : "Game Ended"}
                  </Badge>
                  <Badge variant="secondary" className="px-2.5 py-1 text-xs font-semibold capitalize bg-slate-100 text-slate-700 rounded-full">
                    {gameType} Mode
                  </Badge>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900">
                  {gameData?.game_name}
                </h1>
                <p className="text-slate-500 text-sm font-medium">
                  Hosted by <span className="text-slate-900 font-semibold">{gameData?.host_name}</span>
                </p>
              </div>

              {/* Game Code & Actions */}
              <div className="flex flex-col sm:flex-row items-stretch gap-4 lg:min-w-[400px]">
                {/* Monospace Code Widget */}
                <div className="flex-1 bg-white border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center relative group hover:border-[#2563EB]/40 transition-all duration-300">
                  <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Game Code</p>
                  <button onClick={copyGameCode} className="text-2xl font-black font-mono tracking-widest text-[#2563EB] flex items-center gap-2 hover:scale-105 transition-transform">
                    {gameData?.game_code}
                    <Copy className="w-4 h-4 text-slate-400 group-hover:text-[#2563EB] transition-colors" />
                  </button>
                  <span className="text-[9px] text-slate-400 mt-1 opacity-60">Click code to copy</span>
                </div>

                <div className="flex flex-col justify-center gap-2 sm:w-48">
                  <Button variant="outline" size="sm" onClick={() => router.push("/")} className="w-full flex items-center justify-center gap-2 text-xs font-bold py-2 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl">
                    <RotateCcw className="w-3.5 h-3.5" />
                    Return to Lobby
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowResetDialog(true)} className="flex-1 text-xs font-bold py-2 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl">
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      RESET
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowEndDialog(true)} className="flex-1 text-xs font-bold py-2 border-red-200 text-red-650 hover:bg-red-55 hover:text-red-700 rounded-xl">
                      <LogOut className="w-3.5 h-3.5 mr-1" />
                      END
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Regular Dashboard Status */}
            {isActive && (
              <div className="grid gap-6 lg:grid-cols-12 animate-in slide-in-from-bottom duration-500">
                {/* Left: Caller */}
                <div className="lg:col-span-4 space-y-4">
                  <Card className="border border-slate-200 bg-white shadow-sm rounded-2xl relative overflow-hidden transition-all duration-500">
                    {isPaused && (
                      <div className="absolute inset-0 z-10 bg-white/90 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
                        <div className="text-center">
                          <Pause className="w-12 h-12 text-slate-400 mx-auto mb-2 animate-bounce" />
                          <p className="text-lg font-bold tracking-wider text-slate-800">PAUSED</p>
                        </div>
                      </div>
                    )}
                    <CardHeader className="text-center pb-2">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#2563EB] border border-blue-200 px-2 py-0.5 rounded-full">
                          Current Call #{calledItems.length}
                        </Badge>
                        
                        {/* Voice Announcer Toggle Button */}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            setVoiceEnabled(!voiceEnabled)
                            toast.success(voiceEnabled ? "Voice announcer disabled" : "Voice announcer enabled")
                          }} 
                          className={`h-7 w-7 rounded-full transition-colors ${
                            voiceEnabled 
                              ? "text-green-500 hover:text-green-600 hover:bg-green-50/15" 
                              : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                          }`}
                          title={voiceEnabled ? "Mute Voice Announcer" : "Unmute Voice Announcer"}
                        >
                          {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                        </Button>
                      </div>

                      {gameData?.game_type === "bollywood" && currentReferenceImage && (
                        <div className="space-y-3 animate-in zoom-in-95 duration-500">
                          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 aspect-video relative shadow-sm">
                            <img
                              src={currentReferenceImage}
                              alt={currentBollywoodMapping?.movie_name || "Current Bollywood clue"}
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                            <div className="absolute bottom-2 left-2 right-2 text-left">
                              <span className="text-[10px] uppercase font-black tracking-widest text-white/80">Bollywood Clue</span>
                            </div>
                          </div>
                          <div className="text-xl font-mono font-black text-[#2563EB]">
                            #{currentItem?.value || "-"}
                          </div>
                          <div className="text-2xl sm:text-3xl font-black text-slate-800 truncate">
                            {currentBollywoodMapping?.movie_name || "Bollywood clue"}
                          </div>
                          {currentBollywoodMapping?.dialogue && (
                            <p className="text-sm text-slate-500 italic font-medium">"{currentBollywoodMapping.dialogue}"</p>
                          )}
                        </div>
                      )}
                      
                      {/* Numeric Clue Display */}
                      {!(gameData?.game_type === "bollywood" && currentReferenceImage) && (
                        <div className="py-6 flex flex-col items-center justify-center">
                          <span className="text-8xl font-black tracking-tight text-slate-800 select-none animate-in zoom-in duration-300">
                            {currentItem?.value || "—"}
                          </span>
                        </div>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-5">
                      <Button 
                        size="lg" 
                        onClick={handleCallNext} 
                        disabled={itemPool.length === 0 || isPaused}
                        className="w-full h-14 text-lg font-black text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-sm rounded-xl active:scale-95 transition-all duration-300"
                      >
                        <Play className="w-5 h-5 mr-2 fill-current" />CALL NEXT
                      </Button>

                      {/* Manual Override */}
                      <div className="flex gap-2">
                        <Input 
                          value={manualNumber} 
                          onChange={(e) => setManualNumber(e.target.value)}
                          placeholder="Manual #" 
                          className="text-center font-mono font-bold text-base h-11 border-slate-200 rounded-xl" 
                          onKeyDown={(e) => e.key === "Enter" && handleManualCall()} 
                        />
                        <Button 
                          variant="outline" 
                          onClick={handleManualCall} 
                          disabled={!manualNumber.trim()}
                          className="h-11 px-4 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl"
                        >
                          <Hash className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Auto-call toggle */}
                      {gameData?.auto_call && (
                        <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-50 border border-slate-200/60 transition-colors">
                          <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            Auto-Call Every {gameData.call_interval}s
                          </span>
                          <Switch checked={autoCallActive && !isPaused} onCheckedChange={(v) => setAutoCallActive(v)} />
                        </div>
                      )}

                      {/* Custom progress tracker */}
                      <div className="space-y-2 pt-1 border-t border-slate-100">
                        <div className="flex justify-between text-xs font-semibold text-slate-500">
                          <span>Called: {calledItems.length}</span>
                          <span>Remaining: {itemPool.length}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
                          <div 
                            className="h-full bg-[#2563EB] transition-all duration-500 ease-out" 
                            style={{ width: `${(calledItems.length / (calledItems.length + itemPool.length)) * 100}%` }} 
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Players Panel */}
                  <Card className="border border-slate-200 bg-white shadow-sm rounded-2xl">
                    <CardHeader className="py-3.5 border-b border-slate-100">
                      <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                        <Users className="w-4 h-4 text-slate-400" />
                        Players ({players.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 max-h-56 overflow-y-auto">
                      <div className="flex flex-wrap gap-2">
                        {players.map((p: any) => (
                          <div 
                            key={p.id} 
                            className="flex items-center gap-2 p-1.5 pl-2 pr-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50/50 transition-colors text-xs font-medium max-w-[150px] truncate group shadow-sm"
                          >
                            <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${getAvatarGradient(p.display_name)} flex items-center justify-center text-[9px] font-black text-white flex-shrink-0`}>
                              {p.display_name?.[0]?.toUpperCase()}
                            </div>
                            <span className="truncate flex-1 text-slate-650 group-hover:text-slate-850 transition-colors">{p.display_name}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded" 
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/play/${gameId}/${p.id}`)
                                toast.success("Player link copied!")
                              }}
                              title="Copy Direct Player Link"
                            >
                              <Copy className="w-2.5 h-2.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right: History + Claims */}
                <div className="lg:col-span-8">
                  <Tabs defaultValue="history">
                    <TabsList className="mb-4">
                      <TabsTrigger value="history">Call History</TabsTrigger>
                      <TabsTrigger value="claims" className="relative">
                        Claims
                        {claims.filter((c: any) => c.status === "pending").length > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-[9px] text-white flex items-center justify-center">
                            {claims.filter((c: any) => c.status === "pending").length}
                          </span>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="prizes">Prizes</TabsTrigger>
                    </TabsList>

                    <TabsContent value="history">
                      <Card className="min-h-[450px] border border-slate-200/60 bg-white rounded-2xl shadow-sm">
                        <CardContent className="pt-6">
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                            {calledItems.slice().reverse().map((item) => {
                              const mapping = gameData?.game_type === "bollywood" 
                                ? bollywoodMappings.find(m => m.number.toString() === item.value.toString())
                                : null
                              const isBollywood = gameData?.game_type === "bollywood"
                              
                              return (
                                <div key={item.id}
                                  className={`group relative rounded-xl border overflow-hidden shadow-sm animate-in zoom-in-95 duration-300 transition-all hover:shadow-md ${
                                    isBollywood 
                                      ? "border-slate-200 bg-white hover:border-[#2563EB]/40 aspect-video" 
                                      : "border-slate-200/80 aspect-[4/3] cursor-default"
                                  }`}>
                                  
                                  {isBollywood ? (
                                    /* ===== Bollywood Card: image background ===== */
                                    <>
                                      {mapping?.image_url ? (
                                        <img src={mapping.image_url} className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-500" />
                                      ) : (
                                        <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                                          <span className="text-4xl font-black text-slate-350">{item.value}</span>
                                        </div>
                                      )}
                                      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                                        <span className="text-white font-bold text-xs">#{item.value}</span>
                                        {mapping && <p className="text-white/70 text-[9px] truncate">{mapping.movie_name}</p>}
                                      </div>
                                      <span className="text-[9px] font-black absolute top-2 left-2 w-5 h-5 rounded-full bg-white shadow-sm text-slate-800 flex items-center justify-center">
                                        {item.callOrder}
                                      </span>
                                    </>
                                  ) : (
                                    /* ===== Number Card: gradient style ===== */
                                    <div className="w-full h-full bg-gradient-to-b from-white via-slate-100 to-slate-400 flex items-center justify-center relative">
                                      {/* Call order badge */}
                                      <span className="absolute top-1.5 left-2 text-[10px] font-black text-slate-500 bg-white/70 backdrop-blur-sm rounded px-1 py-0.5 leading-none shadow-sm border border-slate-200/60">
                                        {item.callOrder}
                                      </span>
                                      {/* Large centered number */}
                                      <span className="text-4xl sm:text-5xl font-black text-slate-800 tracking-tight select-none drop-shadow-sm">
                                        {item.value}
                                      </span>
                                      {/* Bottom-left value tag */}
                                      <span className="absolute bottom-1.5 left-2 text-[10px] font-bold text-slate-600">
                                        #{item.value}
                                      </span>
                                    </div>
                                  )}

                                  {/* Delete overlay on hover */}
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:text-red-500 rounded-lg hover:bg-white/10" onClick={() => handleDeleteItem(item)}>
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              )
                            })}
                            {calledItems.length === 0 && (
                              <div className="col-span-full py-24 flex flex-col items-center justify-center text-center text-slate-500 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 p-8 animate-in fade-in duration-300">
                                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                                  <Play className="w-8 h-8 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-bold mb-1 text-slate-800">Board is empty</h3>
                                <p className="text-sm text-slate-400 max-w-sm">
                                  Trigger your first number/clue by clicking the "CALL NEXT" button on the left console.
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="claims">
                      <Card className="min-h-[450px] border border-slate-200/60 bg-white rounded-2xl shadow-sm">
                        <CardContent className="pt-6 space-y-3">
                          {claims.length === 0 && (
                            <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center">
                              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-200">
                                <ShieldCheck className="w-8 h-8 text-slate-400" />
                              </div>
                              <h3 className="text-base font-bold mb-1 text-slate-800">No claims submitted yet</h3>
                              <p className="text-xs text-slate-400">When players claim lines (like Early Five, corners, full house), they will appear here.</p>
                            </div>
                          )}
                          
                          {claims.map((claim: any) => {
                            const isApproved = claim.status === "approved"
                            const isRejected = claim.status === "rejected"
                            const isPending = claim.status === "pending"
                            
                            const statusStyles = isApproved 
                              ? "border-green-200 bg-green-50/30 text-green-700"
                              : isRejected
                              ? "border-red-200 bg-red-50/30 text-red-700"
                              : "border-amber-200 bg-amber-50/30 text-amber-700 animate-pulse"
                              
                            return (
                              <div 
                                key={claim.id} 
                                className={`p-4 rounded-xl border transition-all duration-300 hover:shadow-sm animate-in slide-in-from-right duration-500 ${statusStyles}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-extrabold text-sm text-slate-800">{claim.players?.display_name || "Player"}</p>
                                    <p className="text-xs font-semibold opacity-80 mt-0.5 flex items-center gap-1.5">
                                      <span>
                                        {(() => {
                                          const uiType = (claim.claim_data as any)?.type || claim.claim_type
                                          const info = CLAIM_DISPLAY_INFO[uiType as keyof typeof CLAIM_DISPLAY_INFO]
                                          return info ? `${info.icon} ${info.label}` : uiType.replace(/_/g, " ")
                                        })()}
                                      </span>
                                      {(claim.claim_data as any)?.index !== undefined ? ` (Line ${(claim.claim_data as any).index + 1})` : ""}
                                    </p>
                                  </div>
                                  <Badge 
                                    className={`font-bold flex items-center gap-1 border-none shadow-none rounded-full ${
                                      isApproved ? "bg-green-600 text-white" :
                                      isRejected ? "bg-red-600 text-white" :
                                      "bg-amber-500 text-white"
                                    }`}
                                  >
                                    {isApproved ? (
                                      <><Check className="w-3 h-3" />Approved</>
                                    ) : isRejected ? (
                                      <><X className="w-3 h-3" />Rejected</>
                                    ) : (
                                      <><Clock className="w-3 h-3 animate-spin" />Pending Verification</>
                                    )}
                                  </Badge>
                                </div>
                                {claim.validation_reason && (
                                  <p className="text-xs text-slate-400 mt-2 bg-slate-50/50 p-2 rounded border border-slate-100">
                                    <span className="font-bold text-slate-600">Reason: </span>
                                    {claim.validation_reason}
                                  </p>
                                )}
                              </div>
                            )
                          })}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="prizes">
                      <Card className="min-h-[450px] border border-slate-200/60 bg-white rounded-2xl shadow-sm">
                        <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
                          <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            SET WINNER PRIZES
                          </CardTitle>
                          <CardDescription className="text-xs">Specify the vouchers, cash prizes, coupons, or gifts for each of the 6 claim types.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                          {(() => {
                            const types = [
                              { key: "early_five", label: "Early Five", icon: "🏆", placeholder: "e.g. Amazon Gift Card" },
                              { key: "top_row", label: "Top Line", icon: "⬆️", placeholder: "e.g. Rs. 100 Cash" },
                              { key: "middle_row", label: "Middle Line", icon: "➡️", placeholder: "e.g. Movie Voucher" },
                              { key: "bottom_row", label: "Bottom Line", icon: "⬇️", placeholder: "e.g. Starbucks Coupon" },
                              { key: "corners", label: "Four Corners", icon: "⭐", placeholder: "e.g. Surprise Gift Box" },
                              { key: "full_house", label: "Full House", icon: "🏅", placeholder: "e.g. Grand Prize Hamper" },
                            ]

                            return (
                              <div className="space-y-4 max-w-xl">
                                <div className="grid gap-4">
                                  {types.map((type) => (
                                    <div key={type.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-slate-150 hover:border-slate-300 transition-colors">
                                      <div className="flex items-center gap-2.5 min-w-[140px]">
                                        <span className="text-xl">{type.icon}</span>
                                        <span className="font-extrabold text-xs text-slate-700">{type.label}</span>
                                      </div>
                                      <div className="flex-1 w-full relative">
                                        <Input
                                          value={localPrizes[type.key] || ""}
                                          onChange={(e) => setLocalPrizes(prev => ({ ...prev, [type.key]: e.target.value }))}
                                          placeholder={type.placeholder}
                                          className="h-10 rounded-xl pr-10 border-slate-200/80 focus-visible:ring-1 focus-visible:ring-blue-500 font-medium text-xs bg-slate-50/50 hover:bg-slate-50"
                                        />
                                        <span className="absolute right-3 top-3 text-slate-350">🎁</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                
                                <div className="pt-2 border-t border-slate-100 flex justify-end">
                                  <Button 
                                    className="h-11 rounded-xl px-6 font-black text-xs bg-[#2563EB] hover:bg-[#1D4ED8]"
                                    onClick={handleSavePrizes}
                                    disabled={isSavingPrizes}
                                  >
                                    {isSavingPrizes ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                        SAVING...
                                      </>
                                    ) : (
                                      <>
                                        <Check className="w-3.5 h-3.5 mr-1.5" />
                                        SAVE PRIZES
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            )
                          })()}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom bar - Controls */}
      {isActive && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t p-3 lg:hidden">
          <div className="flex gap-2 max-w-lg mx-auto">
            <Button variant="outline" size="sm" onClick={() => setShowResetDialog(true)}><RotateCcw className="w-4 h-4" /></Button>
            <Button className="flex-1 font-bold" onClick={handleCallNext} disabled={itemPool.length === 0 || isPaused}>
              CALL NEXT
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setShowEndDialog(true)}><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {/* Hidden desktop controls */}
      {/* {isActive && (
        <div className="hidden lg:flex fixed bottom-6 right-6 gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowResetDialog(true)}><RotateCcw className="w-4 h-4 mr-1" />Reset</Button>
          <Button variant="destructive" size="sm" onClick={() => setShowEndDialog(true)}><LogOut className="w-4 h-4 mr-1" />End</Button>
        </div>
      )} */}

      {/* Dialogs */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Game?</AlertDialogTitle>
            <AlertDialogDescription>Clears all calls, marks, and claims. Players keep their tickets.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestartGame}>Yes, Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Game?</AlertDialogTitle>
            <AlertDialogDescription>This permanently ends the session for all players.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndGame} className="bg-destructive text-destructive-foreground">End Game</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Mapping Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Movie Mapping</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Number</Label>
              <Input value={editingItem?.number ?? ""} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Movie Name</Label>
              <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Dialogue / Clue</Label>
              <Input 
                value={editingItem?.dialogue || ""} 
                onChange={(e) => setEditingItem({ ...editingItem, dialogue: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input 
                value={editingItem?.image_url || ""} 
                onChange={(e) => setEditingItem({ ...editingItem, image_url: e.target.value })} 
                placeholder="https://images.unsplash.com/..."
              />
              {editingItem?.image_url && (
                <div className="mt-2 rounded-lg overflow-hidden border aspect-video">
                  <img src={editingItem.image_url} className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
            <Button onClick={() => handleUpdateMapping(editingItem.id, editValue, editingItem.dialogue, editingItem.image_url)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Configure Prizes Dialog */}
      <Dialog open={showPrizesDialog} onOpenChange={setShowPrizesDialog}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Set Winner Prizes
            </DialogTitle>
            <DialogDescription>
              Specify prizes like vouchers, cash, or gifts for each claim pattern. These will be shown on results page.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-4 max-h-[60vh] overflow-y-auto pr-1">
            {(() => {
              const types = [
                { key: "early_five", label: "Early Five", icon: "🏆", placeholder: "e.g. Amazon Gift Card" },
                { key: "top_row", label: "Top Line", icon: "⬆️", placeholder: "e.g. Rs. 100 Cash" },
                { key: "middle_row", label: "Middle Line", icon: "➡️", placeholder: "e.g. Movie Voucher" },
                { key: "bottom_row", label: "Bottom Line", icon: "⬇️", placeholder: "e.g. Starbucks Coupon" },
                { key: "corners", label: "Four Corners", icon: "⭐", placeholder: "e.g. Surprise Gift Box" },
                { key: "full_house", label: "Full House", icon: "🏅", placeholder: "e.g. Grand Prize Hamper" },
              ]

              return types.map((type) => (
                <div key={type.key} className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-150 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{type.icon}</span>
                    <span className="font-extrabold text-xs text-slate-700">{type.label}</span>
                  </div>
                  <div className="relative">
                    <Input
                      value={localPrizes[type.key] || ""}
                      onChange={(e) => setLocalPrizes(prev => ({ ...prev, [type.key]: e.target.value }))}
                      placeholder={type.placeholder}
                      className="h-10 rounded-xl pr-10 border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500 font-medium text-xs bg-white"
                    />
                    <span className="absolute right-3 top-3 text-slate-350">🎁</span>
                  </div>
                </div>
              ))
            })()}
          </div>

          <DialogFooter className="flex-row gap-2 mt-4">
            <Button 
              variant="outline"
              className="flex-1 h-12 rounded-xl text-xs font-bold border-slate-200"
              onClick={() => setShowPrizesDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 h-12 rounded-xl text-xs font-black bg-[#2563EB] hover:bg-[#1D4ED8]"
              onClick={async () => {
                await handleSavePrizes()
                setShowPrizesDialog(false)
              }}
              disabled={isSavingPrizes}
            >
              {isSavingPrizes ? "Saving..." : "Save Prizes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
