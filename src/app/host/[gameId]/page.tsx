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
  ChevronDown, ChevronUp, Link2, Loader2, Sparkles, KeyRound, Home, Star, Trophy
} from "lucide-react"
import confetti from "canvas-confetti"
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
  const router = useRouter()

  const [secretKey, setSecretKey] = useState<string | null>(null)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [passcodeInput, setPasscodeInput] = useState("")
  const [isVerifyingSecret, setIsVerifyingSecret] = useState(false)

  const [gameData, setGameData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
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
  const [topPlayers, setTopPlayers] = useState<any[]>([])

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
  const [showQrDialog, setShowQrDialog] = useState(false)

  // Retrieve base join link using Vercel domain
  const BASE_URL = "https://bingo-game-mu-silk.vercel.app"
  const inviteLink = gameData ? `${BASE_URL}/join/${gameData.game_code}` : ""

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

  // ============ Check localStorage for stored secret key ============
  useEffect(() => {
    if (!gameId) return
    const stored = localStorage.getItem(`hostSecret_${gameId}`)
    if (stored) {
      setSecretKey(stored)
      setIsAuthorized(true)
    } else {
      setIsLoading(false)
    }
  }, [gameId])

  // ============ Verify manually typed secret key ============
  const handleVerifyPasscode = async () => {
    if (!passcodeInput.trim()) {
      toast.error("Please enter the Host Secret Key")
      return
    }
    setIsVerifyingSecret(true)
    try {
      const { data, error } = await supabase
        .from("games")
        .select("id")
        .eq("id", gameId)
        .eq("host_secret", passcodeInput.trim())
        .maybeSingle()

      if (error || !data) {
        toast.error("Invalid host secret key. Check the key and try again.")
        return
      }

      const verifiedKey = passcodeInput.trim()
      localStorage.setItem(`hostSecret_${gameId}`, verifiedKey)
      setSecretKey(verifiedKey)
      setIsAuthorized(true)
      toast.success("Host session authorized!")
    } catch (err) {
      console.error("Passcode verification error:", err)
      toast.error("Verification failed")
    } finally {
      setIsVerifyingSecret(false)
    }
  }

  // ============ Load Game Data ============
  const loadGameData = useCallback(async () => {
    if (!secretKey) return
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

      // Fetch top players if game is ended
      if (gData.status === "ended") {
        if (pData) {
          const stats = await Promise.all(pData.map(async (p) => {
            const { count: mCount } = await supabase.from("player_marks").select("*", { count: "exact", head: true }).eq("player_id", p.id)
            return { name: p.display_name, marks: mCount || 0 }
          }))
          setTopPlayers(stats.sort((a, b) => b.marks - a.marks).slice(0, 5))
        }
      }

      // Auto-Call Timer State Recovery on Refresh
      if (gData.auto_call && gData.auto_call_active && !gData.paused && gData.status === "active") {
        setAutoCallActive(true)
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to load dashboard data")
      router.push("/")
    } finally {
      setIsLoading(false)
    }
  }, [gameId, secretKey, router])

  useEffect(() => {
    if (!isAuthorized || !secretKey) return
    loadGameData()

    const sub = subscribeToHostEvents(gameId, {
      onPlayerJoined: () => loadGameData(),
      onClaimSubmitted: () => loadGameData(),
      onPlayerMarked: () => {},
    })

    return () => sub.unsubscribe()
  }, [isAuthorized, secretKey, loadGameData, gameId])



  // ============ Auto-Call Timer Setup ============
  useEffect(() => {
    if (autoCallActive && gameData?.auto_call && !isPaused && gameData?.status === "active") {
      // Re-trigger calculation of remaining time based on next_call_at if available
      let delay = (gameData.call_interval || 10) * 1000
      if (gameData.next_call_at) {
        const diff = new Date(gameData.next_call_at).getTime() - Date.now()
        if (diff > 0) {
          delay = diff
        } else {
          delay = 100 // Trigger almost immediately if missed
        }
      }

      const executeAutoCall = async () => {
        await handleCallNext()
        // Subsequent calls run on regular interval
        if (autoCallRef.current) clearInterval(autoCallRef.current)
        autoCallRef.current = setInterval(handleCallNext, (gameData.call_interval || 10) * 1000)
      }

      autoCallRef.current = setTimeout(executeAutoCall, delay)
    }
    return () => {
      if (autoCallRef.current) clearTimeout(autoCallRef.current)
    }
  }, [autoCallActive, isPaused, gameData?.status, itemPool.length, gameData?.next_call_at])

  // ============ Voice ============
  const speak = (text: string) => {
    if (!voiceEnabled || typeof window === "undefined") return
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1.1
    speechSynthesis.speak(utterance)
  }

  // ============ API Handled Actions ============
  const handleCallNext = async () => {
    if (gameData?.status === "lobby") {
      toast.error("Please start the game first!")
      return
    }
    if (itemPool.length === 0) {
      toast.error("All items called!")
      setAutoCallActive(false)
      return
    }

    try {
      const response = await fetch("/api/game/call-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, hostSecret: secretKey })
      })
      const result = await response.json()
      if (result.error) throw new Error(result.error)

      const newItem = { id: result.id, value: result.number, callOrder: result.call_order }
      setCalledItems((prev) => [...prev, newItem])
      setCurrentItem(newItem)
      setItemPool((prev) => prev.filter((v) => v !== result.number))
      speak(`Number ${result.number}`)

      setGameData((prev: any) => ({ ...prev, next_call_at: result.next_call_at }))
    } catch (error: any) {
      toast.error(error.message || "Failed to call next number")
    }
  }

  const handleManualCall = async () => {
    if (!manualNumber.trim()) return
    const val = manualNumber.trim()
    if (calledItems.some((c) => c.value === val)) {
      toast.error("Already called!")
      return
    }
    try {
      const response = await fetch("/api/game/call-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, hostSecret: secretKey, number: val })
      })
      const result = await response.json()
      if (result.error) throw new Error(result.error)

      const newItem = { id: result.id, value: val, callOrder: result.call_order }
      setCalledItems((prev) => [...prev, newItem])
      setCurrentItem(newItem)
      setItemPool((prev) => prev.filter((v) => v !== val))
      setManualNumber("")
      speak(`Number ${val}`)

      setGameData((prev: any) => ({ ...prev, next_call_at: result.next_call_at }))
    } catch (error: any) {
      toast.error(error.message || "Failed to call manually")
    }
  }

  const handleStartGame = async () => {
    try {
      const response = await fetch("/api/game/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, hostSecret: secretKey, action: "start" })
      })
      const result = await response.json()
      if (result.error) throw new Error(result.error)

      setGameData((prev: any) => ({ 
        ...prev, 
        status: "active", 
        next_call_at: result.updates?.next_call_at,
        auto_call_active: result.updates?.auto_call_active
      }))
      if (gameData?.auto_call) {
        setAutoCallActive(true)
      }
      toast.success("Game Started!")
    } catch (error: any) {
      toast.error(error.message || "Failed to start game")
    }
  }

  const handlePauseToggle = async () => {
    const newPaused = !isPaused
    try {
      const response = await fetch("/api/game/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, hostSecret: secretKey, action: newPaused ? "pause" : "resume" })
      })
      const result = await response.json()
      if (result.error) throw new Error(result.error)

      setIsPaused(newPaused)
      if (newPaused && autoCallRef.current) clearTimeout(autoCallRef.current)
      if (!newPaused && gameData?.auto_call) setAutoCallActive(true)

      setGameData((prev: any) => ({ 
        ...prev, 
        paused: newPaused, 
        next_call_at: result.updates?.next_call_at 
      }))
      toast.success(newPaused ? "Game paused" : "Game resumed")
    } catch (error: any) {
      toast.error(error.message || "Failed to toggle pause")
    }
  }

  const handleEndGame = async () => {
    try {
      const response = await fetch("/api/game/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, hostSecret: secretKey, action: "end" })
      })
      const result = await response.json()
      if (result.error) throw new Error(result.error)

      setGameData((prev: any) => ({ ...prev, status: "ended", next_call_at: null }))
      setAutoCallActive(false)
      setShowEndDialog(false)
      toast.success("Game ended! Players can now see their scores.")
      await loadGameData()
    } catch (error: any) {
      toast.error(error.message || "Failed to end game")
    }
  }

  const handleRestartGame = async () => {
    try {
      const response = await fetch("/api/game/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, hostSecret: secretKey, action: "reset" })
      })
      const result = await response.json()
      if (result.error) throw new Error(result.error)

      await loadGameData()
      setAutoCallActive(false)
      setShowResetDialog(false)
      toast.success("Game reset!")
    } catch (error: any) {
      toast.error(error.message || "Failed to reset game")
    }
  }

  const handleUpdateMapping = async (id: string, name: string, dialogue: string, image_url: string) => {
    try {
      const response = await fetch("/api/game/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          gameId, 
          hostSecret: secretKey, 
          action: "update_mapping", 
          mappingId: id,
          movieName: name,
          dialogue,
          imageUrl: image_url
        })
      })
      const result = await response.json()
      if (result.error) throw new Error(result.error)

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
    } catch (error: any) {
      toast.error(error.message || "Failed to update mapping")
    }
  }

  const handleDeleteItem = async (item: any) => {
    try {
      const response = await fetch("/api/game/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, hostSecret: secretKey, action: "delete_called_item", calledItemId: item.id })
      })
      const result = await response.json()
      if (result.error) throw new Error(result.error)

      const remaining = calledItems.filter((c) => c.id !== item.id)
      setCalledItems(remaining)
      if (currentItem?.id === item.id) setCurrentItem(remaining.length ? remaining[remaining.length - 1] : null)
      setItemPool((prev) => [...prev, item.value])
      toast.success("Item removed")
    } catch (error: any) {
      toast.error(error.message || "Failed to delete item")
    }
  }

  const handleSavePrizes = async () => {
    setIsSavingPrizes(true)
    try {
      const response = await fetch("/api/game/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, hostSecret: secretKey, action: "update_prizes", prizes: localPrizes })
      })
      const result = await response.json()
      if (result.error) throw new Error(result.error)

      if (typeof window !== "undefined") {
        localStorage.setItem(`prizes_${gameId}`, JSON.stringify(localPrizes))
      }
      toast.success("Prizes updated successfully!")
    } catch (err: any) {
      toast.error(err.message || "Failed to save prizes")
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
    const msg = `🎲 Join my Bingo game!\n\nGame: ${gameData?.game_name}\nGame Code: ${code}\nLink: ${inviteLink}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank")
  }

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink)
      toast.success("Invite link copied!")
    }
  }

  // Render Gatekeeper Passcode Verification if not authorized
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-500">
          <Card className="border-2 border-primary/10 shadow-2xl backdrop-blur-md bg-card/65 rounded-3xl">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20">
                <KeyRound className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-black">Verify Host Access</CardTitle>
              <CardDescription>
                Please enter the secret host key to manage the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="passcode" className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Host Secret Key</Label>
                <Input
                  id="passcode"
                  type="password"
                  placeholder="Enter passcode key (UUID)"
                  value={passcodeInput}
                  onChange={(e) => setPasscodeInput(e.target.value)}
                  className="h-12 rounded-xl text-center text-sm font-semibold tracking-widest border-2"
                  onKeyDown={(e) => e.key === "Enter" && handleVerifyPasscode()}
                  autoComplete="off"
                />
              </div>

              <Button
                onClick={handleVerifyPasscode}
                className="w-full h-12 rounded-xl font-bold mt-2"
                disabled={isVerifyingSecret}
              >
                {isVerifyingSecret ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Authorizing...
                  </>
                ) : (
                  "Unlock Dashboard"
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => router.push("/")}
                className="w-full h-11 rounded-xl text-xs text-muted-foreground hover:bg-slate-100"
              >
                Cancel & Return
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground animate-pulse">Loading Host Dashboard...</p>
      </div>
    )
  }

  const isActive = gameData?.status === "active"
  const currentBollywoodMapping = gameData?.game_type === "bollywood"
    ? bollywoodMappings.find((mapping) => mapping.number.toString() === currentItem?.value?.toString())
    : null
  
  const currentReferenceImage = currentBollywoodMapping?.image_url || (currentBollywoodMapping?.movie_name
    ? getBollywoodItemByTitle(currentBollywoodMapping.movie_name)?.referenceImageUrl
    : null)

  const isLobby = gameData?.status === "lobby"
  const gameType = (gameData?.game_type as "number" | "bollywood" | "custom") || "number"

  const theme = {
    number: {
      accent: "blue",
      badgeBg: "bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]",
      btnColor: "bg-[#2563EB] hover:bg-[#1D4ED8]",
      accentText: "text-[#2563EB]",
      bgAccent: "bg-[#2563EB]",
    },
    bollywood: {
      accent: "amber",
      badgeBg: "bg-amber-50 text-amber-600 border border-amber-200",
      btnColor: "bg-[#2563EB] hover:bg-[#1D4ED8]",
      accentText: "text-amber-600",
      bgAccent: "bg-amber-500",
    },
    custom: {
      accent: "purple",
      badgeBg: "bg-purple-50 text-purple-600 border border-purple-200",
      btnColor: "bg-[#2563EB] hover:bg-[#1D4ED8]",
      accentText: "text-purple-600",
      bgAccent: "bg-purple-500",
    },
  }[gameType] || {
    accent: "neutral",
    badgeBg: "bg-slate-50 text-slate-700 border border-slate-200",
    btnColor: "bg-slate-900 hover:bg-slate-800",
    accentText: "text-slate-900",
    bgAccent: "bg-slate-900",
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 lg:pb-6 relative overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 space-y-8">
        {isLobby ? (
          // ==================== LOBBY VIEW ====================
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Lobby Header / Hero */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-card/45 backdrop-blur-md border border-border/60 rounded-2xl p-6 sm:p-8 shadow-sm">
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
                <div className="flex-1 bg-white border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center relative group hover:border-[#2563EB]/40 transition-all duration-300">
                  <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-1">Game Code</p>
                  <button onClick={copyGameCode} className="text-3xl font-black font-mono tracking-widest text-primary flex items-center gap-2 hover:scale-105 transition-transform">
                    {gameData?.game_code}
                    <Copy className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                  <span className="text-[9px] text-muted-foreground mt-1 opacity-60">Click code to copy</span>
                </div>

                <div className="flex flex-col justify-center gap-2 sm:w-48">
                  <Button variant="outline" size="sm" onClick={shareWhatsApp} className="w-full flex items-center justify-center gap-2 text-xs font-bold py-2.5 rounded-xl">
                    <Share2 className="w-3.5 h-3.5" />
                    WhatsApp Invite
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyInviteLink} className="w-full flex items-center justify-center gap-2 text-xs font-bold py-2.5 rounded-xl">
                    <Link2 className="w-3.5 h-3.5" />
                    Copy Invite Link
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Lobby Grid: Info & Join QR Code */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Game Info Details Card */}
              <div className="md:col-span-2 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200/60 rounded-xl p-4 flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${theme.badgeBg}`}>
                      {gameType === "number" ? <Hash className="w-5 h-5" /> : gameType === "bollywood" ? <Play className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Game Type</p>
                      <p className="font-extrabold text-sm capitalize">{gameType}</p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/60 rounded-xl p-4 flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${theme.badgeBg}`}>
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Ticket Grid</p>
                      <p className="font-extrabold text-sm">{gameData?.ticket_size || "5x5"}</p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/60 rounded-xl p-4 flex items-center gap-3">
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

                  <div className="bg-white border border-slate-200/60 rounded-xl p-4 flex items-center gap-3">
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

                {/* Players Capacity Bar */}
                <Card className="border border-border/60 bg-white">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-500 uppercase tracking-wider font-bold">Joined Capacity</span>
                      <span className={theme.accentText}>{players.length} / {gameData?.max_players || 20}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border">
                      <div className={`h-full ${theme.bgAccent} transition-all duration-500 ease-out`} style={{ width: `${Math.min(100, (players.length / (gameData?.max_players || 20)) * 100)}%` }} />
                    </div>
                  </CardHeader>
                </Card>
              </div>

              {/* QR Code Join Widget */}
              <Card className="border border-slate-200 shadow-sm flex flex-col items-center justify-center p-6 bg-white text-center">
                <CardTitle className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5 justify-center">
                  <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                  QR Code Join
                </CardTitle>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150 mb-3 shadow-inner">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(inviteLink)}`}
                    alt="Scan to Join"
                    className="w-36 h-36 object-contain rounded-lg"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground max-w-xs leading-normal">
                  Players can scan this QR code using their phone camera to join the game instantly.
                </p>
              </Card>
            </div>

            {/* Players Grid Section */}
            <Card className="border border-border/60 bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                  <Users className="w-5 h-5 text-slate-400" />
                  Lobby Waiting Room
                </CardTitle>
                <CardDescription>Players will appear here in real-time as they join.</CardDescription>
              </CardHeader>
              
              <CardContent className="pt-2">
                {players.length === 0 ? (
                  <div className="py-16 flex flex-col items-center justify-center text-center p-8">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 animate-bounce">
                      <Users className="w-8 h-8 text-slate-350" />
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
                        className="bg-white border border-slate-200/60 hover:border-[#2563EB]/30 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all duration-300 hover:shadow-md relative group overflow-hidden animate-in zoom-in-95 duration-300"
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
                    
                    {Array.from({ length: Math.max(0, Math.min(gameData?.max_players || 20, 12) - players.length) }).map((_, idx) => (
                      <div 
                        key={`empty-${idx}`} 
                        className="border-2 border-dashed border-slate-100 bg-slate-50/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center h-[116px] animate-pulse"
                      >
                        <div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-200 mb-2">
                          <Users className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-slate-350">Waiting...</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions Panel */}
            <div className="bg-white border border-border/60 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
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
                  className="font-bold border-amber-200/60 text-amber-700 hover:bg-amber-50"
                >
                  <Sparkles className="w-4 h-4 mr-2 text-amber-500 fill-amber-500/10" />
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

            {/* Bollywood Mapping list */}
            {gameType === "bollywood" && (
              <Card className="border border-border bg-white overflow-hidden">
                <button 
                  onClick={() => setIsBollywoodExpanded(!isBollywoodExpanded)}
                  className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors border-b"
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
                        <thead className="sticky top-0 bg-slate-50 z-10 border-b">
                          <tr>
                            <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground w-20">#</th>
                            <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Movie Name</th>
                            <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground hidden sm:table-cell">Clue Image</th>
                            <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground text-right">Edit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
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
          // ==================== ACTIVE/ENDED DASHBOARD ====================
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

              {/* Game Code, Share & Actions */}
              <div className="flex flex-col sm:flex-row items-stretch gap-3 lg:min-w-[520px]">
                {/* Game Code + QR */}
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3 hover:border-[#2563EB]/40 transition-all duration-300">
                  <div className="flex flex-col items-center justify-center text-center group">
                    <p className="text-[9px] uppercase font-black tracking-widest text-slate-400 mb-0.5">Game Code</p>
                    <button onClick={copyGameCode} className="text-xl font-black font-mono tracking-widest text-[#2563EB] flex items-center gap-1.5 hover:scale-105 transition-transform">
                      {gameData?.game_code}
                      <Copy className="w-3 h-3 text-slate-400 group-hover:text-[#2563EB] transition-colors" />
                    </button>
                  </div>
                  <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm flex-shrink-0 cursor-pointer hover:border-[#2563EB]/50 hover:shadow-md transition-all" onClick={() => setShowQrDialog(true)} title="Click to enlarge QR">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=64x64&data=${encodeURIComponent(inviteLink)}`}
                      alt="Scan to Join"
                      className="w-12 h-12 object-contain rounded"
                    />
                  </div>
                </div>

                {/* Share Buttons */}
                <div className="flex flex-col justify-center gap-1.5">
                  <Button variant="outline" size="sm" onClick={shareWhatsApp} className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold py-2 rounded-xl border-slate-200 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors">
                    <Share2 className="w-3 h-3" />
                    WhatsApp Invite
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyInviteLink} className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold py-2 rounded-xl border-slate-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors">
                    <Link2 className="w-3 h-3" />
                    Copy Invite Link
                  </Button>
                </div>

                {/* Game Controls */}
                <div className="flex flex-col justify-center gap-1.5 sm:w-44">
                  <Button variant="outline" size="sm" onClick={() => router.push("/")} className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold py-2 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl">
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Return to Lobby
                  </Button>
                  {gameData?.status === "ended" ? (
                    <Button variant="outline" size="sm" onClick={() => setShowResetDialog(true)} className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold py-2 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl">
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Reset Game
                    </Button>
                  ) : (
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => setShowResetDialog(true)} className="flex-1 text-[11px] font-bold py-2 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl">
                        <RotateCcw className="w-3 h-3 mr-1" />
                        RESET
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setShowEndDialog(true)} className="flex-1 text-[11px] font-bold py-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl">
                        <LogOut className="w-3 h-3 mr-1" />
                        END
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Dashboard Status */}
            {gameData?.status === "active" && (
              <div className="grid gap-6 lg:grid-cols-12 animate-in slide-in-from-bottom duration-500">
                {/* Left: Caller Panel */}
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
                          type="number"
                          placeholder="Manual Number" 
                          className="text-center font-mono font-bold text-base h-11 border-slate-200 rounded-xl" 
                          onKeyDown={(e) => e.key === "Enter" && handleManualCall()} 
                          autoComplete="off"
                        />
                        <Button 
                          variant="outline" 
                          onClick={handleManualCall} 
                          disabled={!manualNumber.trim()}
                          className="h-11 px-4 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl"
                        >
                          CALL
                        </Button>
                      </div>

                      {/* Auto-call toggle */}
                      {gameData?.auto_call && (
                        <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-50 border border-slate-200/60 transition-colors">
                          <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            Auto-Call Every {gameData.call_interval}s
                          </span>
                          <Switch checked={autoCallActive && !isPaused} onCheckedChange={(v) => {
                            setAutoCallActive(v)
                            supabase.from("games").update({ auto_call_active: v }).eq("id", gameId)
                          }} />
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
                                    <>
                                      {mapping?.image_url ? (
                                        <img src={mapping.image_url} className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-500" />
                                      ) : (
                                        <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                                          <span className="text-4xl font-black text-slate-355">{item.value}</span>
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
                                    <div className="w-full h-full bg-gradient-to-b from-white via-slate-100 to-slate-400 flex items-center justify-center relative">
                                      <span className="absolute top-1.5 left-2 text-[10px] font-black text-slate-500 bg-white/70 backdrop-blur-sm rounded px-1 py-0.5 leading-none shadow-sm border border-slate-200/60">
                                        {item.callOrder}
                                      </span>
                                      <span className="text-4xl sm:text-5xl font-black text-slate-800 tracking-tight select-none drop-shadow-sm">
                                        {item.value}
                                      </span>
                                      <span className="absolute bottom-1.5 left-2 text-[10px] font-bold text-slate-650">
                                        #{item.value}
                                      </span>
                                    </div>
                                  )}

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
                              <p className="text-xs text-slate-400">When players claim lines, they will appear here.</p>
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
                              : "border-amber-200 bg-amber-50/30 text-amber-700"
                              
                            return (
                              <div 
                                key={claim.id} 
                                className={`p-4 rounded-xl border transition-all duration-300 hover:shadow-sm animate-in slide-in-from-right duration-550 ${statusStyles}`}
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
                                      <><Clock className="w-3 h-3 animate-spin" />Pending</>
                                    )}
                                  </Badge>
                                </div>
                                {claim.validation_reason && (
                                  <p className="text-xs text-slate-400 mt-2 bg-slate-50/50 p-2 rounded border border-slate-100">
                                    <span className="font-bold text-slate-650">Reason: </span>
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
                          <CardDescription className="text-xs">Specify the prizes for each of the 6 claim types.</CardDescription>
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
                                          className="h-10 rounded-xl pr-10 border-slate-200/80 focus-visible:ring-1 focus-visible:ring-blue-500 font-medium text-xs bg-slate-50/50 hover:bg-slate-55"
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

            {gameData?.status === "ended" && (
              <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
                {/* Header Hero */}
                <div className="text-center space-y-4 py-6">
                  <div className="inline-block p-4 rounded-full bg-yellow-500/10 mb-2 animate-bounce">
                    <Trophy className="w-16 h-16 text-yellow-500" />
                  </div>
                  <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter italic text-slate-800 font-extrabold uppercase">GAME OVER!</h2>
                  <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider">
                    Final results for <span className="text-slate-900 font-black">{gameData?.game_name}</span>
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Winners Section */}
                  <Card className="border-2 border-yellow-500/30 overflow-hidden shadow-xl bg-white rounded-2xl">
                    <CardHeader className="bg-yellow-500/5 pb-4 border-b border-slate-100">
                      <CardTitle className="flex items-center gap-2 text-yellow-600 font-black">
                        <Star className="w-5 h-5 fill-yellow-500 text-yellow-500 animate-pulse" />
                        Champions
                      </CardTitle>
                      <CardDescription className="text-xs font-medium text-slate-500">First players to claim bingo</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      {(() => {
                        const types = [
                          "early_five",
                          "top_row",
                          "middle_row",
                          "bottom_row",
                          "corners",
                          "full_house"
                        ] as const

                        const winnersList = claims.filter((c) => c.status === "approved")

                        return (
                          <div className="divide-y divide-slate-100">
                            {types.map((type) => {
                              const info = CLAIM_DISPLAY_INFO[type]
                              const claimWinner = winnersList.find(win => {
                                const uiType = (win.claim_data as any)?.type || win.claim_type
                                return uiType === type
                              })
                              const savedPrizes = typeof window !== 'undefined' ? localStorage.getItem("prizes_" + gameId) : null
                              const prizesObj = gameData?.prizes || (savedPrizes ? JSON.parse(savedPrizes) : {})
                              const prize = prizesObj[type]

                              return (
                                <div key={type} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-2 hover:bg-slate-50/30 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <span className="text-2xl flex-shrink-0">{info?.icon || "🏆"}</span>
                                    <div>
                                      <p className="font-extrabold text-sm text-slate-805">{info?.label || type}</p>
                                      {prize && (
                                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full mt-1.5 animate-in fade-in">
                                          <span>🎁</span>
                                          <span className="uppercase tracking-wider text-[8px] text-amber-500/80 mr-0.5">Prize:</span>
                                          {prize}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 self-start sm:self-center">
                                    {claimWinner ? (
                                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-250 hover:bg-emerald-100 font-black px-2.5 py-1 text-xs rounded-full flex items-center gap-1 max-w-[150px] sm:max-w-xs">
                                        <Trophy className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                                        <span className="truncate">{claimWinner.players?.display_name || "Winner"}</span>
                                      </Badge>
                                    ) : (
                                      <span className="text-xs text-slate-450 font-bold bg-slate-100 border border-slate-200/60 px-2.5 py-1 rounded-full">
                                        Unclaimed
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })()}
                    </CardContent>
                  </Card>

                  {/* Stats & Top Activity Section */}
                  <div className="space-y-6">
                    <Card className="bg-white border border-slate-200/60 shadow-sm rounded-2xl">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-450 flex items-center gap-2">
                          <Hash className="w-4 h-4 text-slate-400" /> Game Stats
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                            <p className="text-[9px] uppercase font-black tracking-widest text-slate-400">Total Calls</p>
                            <p className="text-3xl font-black text-slate-800 mt-1">{calledItems.length}</p>
                          </div>
                          <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                            <p className="text-[9px] uppercase font-black tracking-widest text-slate-400">Mode</p>
                            <p className="text-xl font-black text-slate-800 mt-1 capitalize truncate">{gameData?.game_type}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white border border-slate-200/60 shadow-sm rounded-2xl overflow-hidden">
                      <CardHeader className="pb-2 border-b border-slate-100">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-450 flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-400" /> Top Activity
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="divide-y text-sm">
                          {topPlayers.map((p, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50/20 transition-colors">
                              <span className="font-extrabold text-slate-700">{p.name}</span>
                              <Badge variant="secondary" className="font-black px-2 py-0.5 text-xs bg-blue-50 text-blue-700 border-blue-200 rounded-full">
                                {p.marks} marks
                              </Badge>
                            </div>
                          ))}
                          {topPlayers.length === 0 && (
                            <div className="p-8 text-center text-slate-400 italic text-xs">
                              No player activity data available.
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Footer / Host Actions */}
                <div className="flex flex-col sm:flex-row gap-4 pt-6 max-w-xl mx-auto">
                  <Button 
                    size="lg" 
                    className="flex-1 h-14 rounded-2xl font-black text-lg text-white bg-green-600 hover:bg-green-500 shadow-lg shadow-green-900/10 hover:scale-[1.02] active:scale-95 transition-all duration-300"
                    onClick={() => setShowResetDialog(true)}
                  >
                    <RotateCcw className="w-5 h-5 mr-2 animate-spin-slow" />
                    RESTART NEW GAME
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="flex-1 h-14 rounded-2xl font-bold text-lg border-2 hover:bg-slate-50 hover:scale-[1.02] active:scale-95 transition-all duration-300"
                    onClick={() => router.push("/")}
                  >
                    <Home className="w-5 h-5 mr-2" />
                    BACK TO HOME
                  </Button>
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
              <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label>Dialogue / Clue</Label>
              <Input 
                value={editingItem?.dialogue || ""} 
                onChange={(e) => setEditingItem({ ...editingItem, dialogue: e.target.value })} 
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input 
                value={editingItem?.image_url || ""} 
                onChange={(e) => setEditingItem({ ...editingItem, image_url: e.target.value })} 
                placeholder="https://images.unsplash.com/..."
                autoComplete="off"
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
                      autoComplete="off"
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

      {/* QR Code Popup Modal */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="w-full max-w-sm rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="bg-gradient-to-b from-[#2563EB] to-[#1D4ED8] p-6 text-center space-y-1">
            <DialogTitle className="text-white font-black text-lg tracking-tight">Scan to Join Game</DialogTitle>
            <DialogDescription className="text-white/70 text-xs">Players can scan this QR code to join instantly</DialogDescription>
          </DialogHeader>
          <div className="p-6 flex flex-col items-center gap-5">
            <div className="bg-white p-3 rounded-2xl border-2 border-slate-200 shadow-lg">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(inviteLink)}`}
                alt="Scan to Join"
                className="w-56 h-56 object-contain"
              />
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Game Code</p>
              <button onClick={copyGameCode} className="text-3xl font-black font-mono tracking-widest text-[#2563EB] flex items-center gap-2 hover:scale-105 transition-transform mx-auto">
                {gameData?.game_code}
                <Copy className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full">
              <Button variant="outline" size="sm" onClick={shareWhatsApp} className="flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-xl border-slate-200 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors">
                <Share2 className="w-3.5 h-3.5" />
                WhatsApp
              </Button>
              <Button variant="outline" size="sm" onClick={copyInviteLink} className="flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-xl border-slate-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors">
                <Link2 className="w-3.5 h-3.5" />
                Copy Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
