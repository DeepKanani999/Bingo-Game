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
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { generateNumberPool, shuffleArray } from "@/lib/bingo-utils"
import { getBollywoodItemByTitle } from "@/lib/bollywood-data"
import { subscribeToHostEvents } from "@/lib/realtime"

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

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-6">
      {/* Header & Controls */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight text-primary flex items-center gap-3">
              {gameData?.game_name}
              <Badge variant={gameData?.status === "active" ? "default" : "outline"} className="uppercase">
                {gameData?.status}
              </Badge>
            </h1>
            <p className="text-muted-foreground font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              {players.length} Players Joined • Code: <span className="text-primary font-bold font-mono tracking-widest">{gameData?.game_code}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {gameData?.status === "lobby" && (
              <Button size="lg" onClick={handleStartGame} className="bg-green-600 hover:bg-green-700 shadow-xl shadow-green-900/20">
                <Play className="w-5 h-5 mr-2" />
                START GAME
              </Button>
            )}
            <Button variant="outline" size="lg" onClick={() => router.push("/")}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Return to Lobby
            </Button>
            <Button variant="outline" size="lg" onClick={() => setShowResetDialog(true)}>
              <RotateCcw className="w-4 h-4 mr-2" />
              RESET
            </Button>
            <Button variant="destructive" size="lg" onClick={() => setShowEndDialog(true)}>
              <LogOut className="w-4 h-4 mr-2" />
              END
            </Button>
          </div>
        </div>

        {/* Verification Lobby View */}
        {gameData?.status === "lobby" && gameData.game_type === "bollywood" && (
          <Card className="border-4 border-primary/20 bg-card shadow-2xl animate-in zoom-in duration-500 overflow-hidden">
            <CardHeader className="bg-primary/5 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-black">Verification Lobby</CardTitle>
                  <CardDescription>Review and verify all Bollywood mappings before starting the game.</CardDescription>
                </div>
                <Badge variant="secondary" className="px-4 py-1 text-lg">
                  {bollywoodMappings.length} Movies Linked
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[60vh] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-muted/90 backdrop-blur-md z-10">
                    <tr>
                      <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground border-b w-20">#</th>
                      <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground border-b">Movie Name</th>
                      <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground border-b hidden sm:table-cell">Image Reference</th>
                      <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground border-b text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {bollywoodMappings.map((m) => (
                      <tr key={m.id} className="hover:bg-primary/5 transition-colors group">
                        <td className="p-4 font-mono font-bold text-primary">#{m.number}</td>
                        <td className="p-4">
                          <div className="font-bold text-lg">{m.movie_name}</div>
                          {m.dialogue && <div className="text-xs text-muted-foreground italic line-clamp-1">"{m.dialogue}"</div>}
                        </td>
                        <td className="p-4 hidden sm:table-cell">
                          {m.image_url ? (
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg overflow-hidden border">
                                <img src={m.image_url} className="w-full h-full object-cover" />
                              </div>
                              <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[150px]">{m.image_url}</span>
                            </div>
                          ) : (
                            <Badge variant="destructive">No Image</Badge>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <Button variant="ghost" size="icon" onClick={() => {
                            setEditingItem(m)
                            setEditValue(m.movie_name)
                          }} className="group-hover:text-primary">
                            <Edit3 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <div className="p-6 bg-muted/30 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                <span className="font-bold underline text-foreground">Tip:</span> Ensure all images are working. Players will identify movies based on these images.
              </div>
              <Button size="lg" onClick={handleStartGame} className="w-full sm:w-auto px-10 h-14 text-xl font-black bg-green-600 hover:bg-green-700 shadow-xl shadow-green-900/20">
                LOBBY CLEAR - START GAME 🎬
              </Button>
            </div>
          </Card>
        )}

        {/* Regular Dashboard Status */}
        {isActive && (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left: Caller */}
            <div className="lg:col-span-4 space-y-4">
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5 shadow-xl relative overflow-hidden">
                {isPaused && (
                  <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center">
                      <Pause className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-lg font-bold">PAUSED</p>
                    </div>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardDescription className="text-xs uppercase tracking-widest font-bold">Current Call #{calledItems.length}</CardDescription>
                  {gameData?.game_type === "bollywood" && currentReferenceImage && (
                    <div className="space-y-3">
                      <div className="overflow-hidden rounded-2xl border border-primary/20 bg-black/10">
                        <img
                          src={currentReferenceImage}
                          alt={currentBollywoodMapping?.movie_name || "Current Bollywood clue"}
                          className="h-52 w-full object-cover"
                        />
                      </div>
                      <div className="text-sm font-bold text-primary">
                        #{currentItem?.value || "-"}
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-primary">
                        {currentBollywoodMapping?.movie_name || "Bollywood clue"}
                      </div>
                      {currentBollywoodMapping?.dialogue && (
                        <p className="text-sm text-muted-foreground">{currentBollywoodMapping.dialogue}</p>
                      )}
                    </div>
                  )}
                  <CardTitle className={`${gameData?.game_type === "bollywood" && currentReferenceImage ? "hidden" : "text-7xl sm:text-8xl"} font-black text-primary`}>
                    {currentItem?.value || "—"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button size="lg" onClick={handleCallNext} disabled={itemPool.length === 0 || isPaused}
                    className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20 active:scale-95 transition-transform">
                    <Play className="w-5 h-5 mr-2 fill-current" />CALL NEXT
                  </Button>

                  {/* Manual Override */}
                  <div className="flex gap-2">
                    <Input value={manualNumber} onChange={(e) => setManualNumber(e.target.value)}
                      placeholder="Manual #" className="text-center font-mono" onKeyDown={(e) => e.key === "Enter" && handleManualCall()} />
                    <Button variant="outline" onClick={handleManualCall} disabled={!manualNumber.trim()}>
                      <Hash className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Auto-call toggle */}
                  {gameData?.auto_call && (
                    <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30">
                      <span className="text-muted-foreground">Auto-Call ({gameData.call_interval}s)</span>
                      <Switch checked={autoCallActive && !isPaused} onCheckedChange={(v) => setAutoCallActive(v)} />
                    </div>
                  )}

                  <div className="flex justify-between text-xs text-muted-foreground px-1">
                    <span>Remaining: {itemPool.length}</span>
                    <Progress value={(calledItems.length / (calledItems.length + itemPool.length)) * 100} className="w-20 h-1.5 my-auto" />
                    <span>Called: {calledItems.length}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Players */}
              <Card>
                <CardHeader className="py-3"><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" />Players ({players.length})</CardTitle></CardHeader>
                <CardContent className="max-h-48 overflow-y-auto space-y-2">
                  {players.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/20">
                      <span className="font-medium">{p.display_name}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/play/${gameId}/${p.id}`)
                        toast.success("Player link copied!")
                      }}><Copy className="w-3 h-3" /></Button>
                    </div>
                  ))}
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
                </TabsList>

                <TabsContent value="history">
                  <Card className="min-h-[450px] shadow-inner bg-muted/20">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                        {calledItems.slice().reverse().map((item) => {
                          const mapping = gameData?.game_type === "bollywood" 
                            ? bollywoodMappings.find(m => m.number.toString() === item.value.toString())
                            : null
                          
                          return (
                            <div key={item.id}
                              className="group relative rounded-xl border bg-card hover:border-primary/50 transition-all aspect-video overflow-hidden shadow-sm">
                              {mapping?.image_url ? (
                                <img src={mapping.image_url} className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-500" />
                              ) : (
                                <div className="w-full h-full bg-primary/5 flex items-center justify-center">
                                  <span className="text-4xl font-black opacity-10">{item.value}</span>
                                </div>
                              )}
                              
                              <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                <span className="text-white font-bold text-xs">#{item.value}</span>
                                {mapping && <p className="text-white/70 text-[10px] truncate">{mapping.movie_name}</p>}
                              </div>

                              <span className="text-[10px] font-bold absolute top-2 left-2 w-5 h-5 rounded-full bg-white shadow-lg text-black flex items-center justify-center">
                                {item.callOrder}
                              </span>
                              
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:text-destructive" onClick={() => handleDeleteItem(item)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                        {calledItems.length === 0 && (
                          <div className="col-span-full py-24 text-center text-muted-foreground bg-muted/50 rounded-2xl border-2 border-dashed">
                            <Play className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p className="text-lg font-medium opacity-50">Board is empty. Let's start calling!</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="claims">
                  <Card className="min-h-[350px]">
                    <CardContent className="pt-6 space-y-3">
                      {claims.length === 0 && (
                        <div className="py-16 text-center text-muted-foreground">
                          <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">No claims yet</p>
                        </div>
                      )}
                      {claims.map((claim: any) => (
                        <div key={claim.id} className={`p-4 rounded-xl border ${
                          claim.status === "approved" ? "border-green-500/30 bg-green-500/5" :
                          claim.status === "rejected" ? "border-destructive/30 bg-destructive/5" :
                          "border-primary/30 bg-primary/5"
                        }`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-sm">{claim.players?.display_name || "Player"}</p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {(claim.claim_data as any)?.type?.replace(/_/g, " ") || claim.claim_type.replace(/_/g, " ")} claim
                                {(claim.claim_data as any)?.index !== undefined ? ` (Line ${(claim.claim_data as any).index + 1})` : ""}
                              </p>
                            </div>
                            <Badge variant={claim.is_valid ? "default" : "destructive"}>
                              {claim.is_valid ? <><Check className="w-3 h-3 mr-1" />Valid</> : <><X className="w-3 h-3 mr-1" />Invalid</>}
                            </Badge>
                          </div>
                          {claim.validation_reason && (
                            <p className="text-xs text-muted-foreground mt-2">{claim.validation_reason}</p>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
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
              <Input value={editingItem?.number} disabled className="bg-muted" />
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
    </div>
  )
}
