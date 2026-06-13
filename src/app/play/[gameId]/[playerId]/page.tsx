"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import confetti from "canvas-confetti"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { 
  Loader2,
  Trophy, 
  Clock, 
  Volume2, 
  VolumeX, 
  Share2, 
  CheckCircle2, 
  Radio,
  ChevronLeft,
  Info,
  History,
  X,
  Sparkles,
  Star,
  Crown,
  Check,
  TrendingUp,
  ChevronUp,
  ChevronDown,
  Hash,
  Users
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { 
  TicketSize, 
  BoardCell, 
  checkBingo, 
  getGridConfig
} from "@/lib/bingo-utils"
import { 
  generateTicketsForPlayers, 
  reconstructBoardFromTicketData,
  generateNumberItems,
  generateBollywoodItems
} from "@/lib/ticket-generator"
import { validateClaim, ClaimType, CLAIM_DISPLAY_INFO } from "@/lib/claim-validator"
import { subscribeToGame } from "@/lib/realtime"
import { usePlayerStore } from "@/stores/playerStore"

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

export default function PlayerBoardPage() {
  const params = useParams()
  const gameId = params.gameId as string
  const playerId = params.playerId as string
  const router = useRouter()
  
  // Local state
  const [gameData, setGameData] = useState<any>(null)
  const [board, setBoard] = useState<BoardCell[]>([])
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set())
  const [calledValues, setCalledValues] = useState<Set<string>>(new Set())
  const [calledHistory, setCalledHistory] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false)
  const [showClaimDialog, setShowClaimDialog] = useState(false)
  const [selectedClaimType, setSelectedClaimType] = useState<ClaimType | null>(null)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [lastCalled, setLastCalled] = useState<any>(null)
  const [bollywoodMappings, setBollywoodMappings] = useState<any[]>([])
  const [lastCalledMapping, setLastCalledMapping] = useState<any>(null)
  const [failedMarkIds, setFailedMarkIds] = useState<Set<string>>(new Set())
  const [isZoomOpen, setIsZoomOpen] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [playerClaims, setPlayerClaims] = useState<any[]>([])
  const [winners, setWinners] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [showLeaderboard, setShowLeaderboard] = useState(true)
  const [announcement, setAnnouncement] = useState<{ name: string; claimLabel: string; prize: string } | null>(null)
  const mappingsRef = useRef<any[]>([])
  const hasLoadedRef = useRef(false)
  const gameTypeRef = useRef<string>("number")
  
  // Store actions
  const setPlayerIdentity = usePlayerStore((s) => s.setPlayerIdentity)

  const fetchWinners = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("claims")
        .select("*, players(display_name)")
        .eq("game_id", gameId)
        .eq("status", "approved")
        .order("created_at", { ascending: true })
      if (data) setWinners(data)
    } catch (err) {
      console.error("Error fetching winners:", err)
    }
  }, [gameId])

  const fetchLeaderboard = useCallback(async () => {
    try {
      const { data: playersList } = await supabase
        .from("players")
        .select("id, display_name")
        .eq("game_id", gameId)

      if (!playersList) return

      const stats = await Promise.all(
        playersList.map(async (p) => {
          const { count } = await supabase
            .from("player_marks")
            .select("*", { count: "exact", head: true })
            .eq("player_id", p.id)
          
          return { id: p.id, name: p.display_name, marks: count || 0 }
        })
      )
      
      setLeaderboard(stats.sort((a, b) => b.marks - a.marks))
    } catch (err) {
      console.error("Leaderboard fetch error:", err)
    }
  }, [gameId])

  // ============ Initial Load ============
  const loadData = useCallback(async () => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true
    
    try {
      // 1. Fetch Game
      const { data: gData, error: gError } = await supabase
        .from("games")
        .select("*")
        .eq("id", gameId)
        .single()
      
      if (gError || !gData) throw gError
      gameTypeRef.current = gData.game_type
      if (gData.status === "ended") {
        setGameData(gData)
        setIsGameOver(true)
      } else {
        setGameData(gData)
      }

      // 2. Fetch Player
      const { data: pData, error: pError } = await supabase
        .from("players")
        .select("*")
        .eq("id", playerId)
        .single()
      
      if (pError || !pData) throw pError
      setPlayerIdentity(pData.id, pData.display_name, pData.join_token, gameId)

      // 3. Fetch Bollywood Mappings
      let currentMappings: any[] = []
      if (gData.game_type === "bollywood") {
        const { data: bMappings } = await supabase
          .from("bollywood_mappings")
          .select("*")
          .eq("game_id", gameId)
        
        currentMappings = bMappings || []
        setBollywoodMappings(currentMappings)
        mappingsRef.current = currentMappings
      }

      // 4. Fetch Ticket (or Generate if missing)
      let { data: tData, error: tError } = await supabase
        .from("player_tickets")
        .select("*")
        .eq("player_id", playerId)
        .single()
      
      if (tError && tError.code !== "PGRST116") throw tError

      let finalBoard: BoardCell[] = []
      if (!tData) {
        let itemsBase: any[] = []
        if (gData.game_type === "number") {
          itemsBase = generateNumberItems(gData.number_range || 90)
        } else {
          if (currentMappings.length > 0) {
            itemsBase = generateBollywoodItems(currentMappings)
          } else {
            itemsBase = generateNumberItems(90)
          }
        }
        
        const generated = generateTicketsForPlayers([playerId], itemsBase, gData.ticket_size as TicketSize)[0]
        finalBoard = generated.cells
        
        const { error: insertError } = await supabase.from("player_tickets").insert({
          player_id: playerId,
          game_id: gameId,
          ticket_data: generated.ticketData
        })

        if (insertError) {
          const { data: retryData } = await supabase
            .from("player_tickets")
            .select("*")
            .eq("player_id", playerId)
            .single()
          
          if (retryData) {
            finalBoard = reconstructBoardFromTicketData(retryData.ticket_data as any[])
          }
        }
      } else {
        finalBoard = reconstructBoardFromTicketData(tData.ticket_data as any[])
      }
      setBoard(finalBoard)

      // 5. Fetch Marks
      const { data: mData } = await supabase
        .from("player_marks")
        .select("item_id")
        .eq("player_id", playerId)
      
      const marks = new Set(mData?.map(m => m.item_id) || [])
      setMarkedIds(marks)

      // 6. Fetch Called Items
      const { data: cData } = await supabase
        .from("called_items")
        .select("*")
        .eq("game_id", gameId)
        .order("call_order", { ascending: true })
      
      const values = new Set(cData?.map(c => c.item_id) || [])
      setCalledValues(values)
      setCalledHistory(cData || [])
      
      if (cData && cData.length > 0) {
        const last = cData[cData.length - 1]
        setLastCalled(last)
        if (gData.game_type === "bollywood") {
          const mapping = currentMappings.find(m => m.number.toString() === last.item_id.toString())
          setLastCalledMapping(mapping)
        }
      }
      
      // 7. Fetch Player's Claims
      const { data: clData } = await supabase
        .from("claims")
        .select("*")
        .eq("player_id", playerId)
      
      setPlayerClaims(clData || [])

      await fetchWinners()
      await fetchLeaderboard()

    } catch (error) {
      console.error("Load error:", error)
      toast.error("Failed to load game")
      router.push("/")
    } finally {
      setIsLoading(false)
    }
  }, [gameId, playerId, router, setPlayerIdentity, fetchWinners, fetchLeaderboard])

  useEffect(() => {
    loadData()
    
    const sub = subscribeToGame(gameId, {
      onNumberCalled: (payload) => {
        const item = payload.new
        setCalledValues(prev => new Set([...prev, item.item_id]))
        setCalledHistory(prev => [...prev, item])
        setLastCalled(item)
        
        if (mappingsRef.current.length > 0) {
          const mapping = mappingsRef.current.find(m => m.number.toString() === item.item_id.toString())
          setLastCalledMapping(mapping)
        }
        if (gameTypeRef.current === "bollywood") {
          toast.info("🎬 New Bollywood clue called! Guess the movie.", { position: "top-center" })
        } else {
          toast.info(`New number: ${item.item_id}`, { position: "top-center" })
        }
      },
      onPlayerJoined: () => {
        fetchLeaderboard()
      },
      onPlayerMarked: () => {
        fetchLeaderboard()
      },
      onGameStatusChanged: (payload) => {
        if (payload.new.status === "ended") {
          setIsGameOver(true)
          fetchWinners()
          toast.success("Game completed! Viewing results...", { position: "top-center", duration: 5000 })
        }
        setGameData((prev: any) => ({ ...prev, ...payload.new }))
      },
      onClaimResult: (payload) => {
        const claim = payload.new
        if (claim.player_id === playerId) {
          setPlayerClaims(prev => {
            const idx = prev.findIndex(c => c.id === claim.id)
            if (idx > -1) return prev.map((c, i) => i === idx ? claim : c)
            return [...prev, claim]
          })
        }

        if (claim.status === "approved") {
          fetchWinners()
          
          // Fetch player's display name and game prizes to celebrate
          Promise.all([
            supabase.from("players").select("display_name").eq("id", claim.player_id).single(),
            supabase.from("games").select("prizes").eq("id", gameId).single()
          ]).then(([{ data: playerData }, { data: gameData }]) => {
            const name = playerData?.display_name || "Someone"
            const info = CLAIM_DISPLAY_INFO[claim.claim_type as keyof typeof CLAIM_DISPLAY_INFO]
            const label = info ? `${info.icon} ${info.label}` : claim.claim_type.replace(/_/g, " ")
            
            // Resolve prize
            const prizesObj = (gameData?.prizes as any) || {}
            const prize = prizesObj[claim.claim_type]
            const prizeText = prize ? ` (Prize: 🎁 ${prize})` : ""

            // Show big center screen announcement overlay for all players
            setAnnouncement({ name, claimLabel: label, prize: prize || "" })

            if (claim.player_id === playerId) {
              toast.success(`🎉 BINGO! Your claim for ${label} was approved!${prizeText}`, {
                duration: 8000,
                position: "top-center"
              })
            } else {
              toast.success(`🎉 ${name} won ${label}!${prizeText}`, {
                duration: 8000,
                position: "top-center"
              })
            }

            // Trigger celebratory confetti burst for all players!
            confetti({
              particleCount: 150,
              spread: 80,
              origin: { y: 0.6 }
            })

            // Automatically clear announcement overlay after 5 seconds
            setTimeout(() => {
              setAnnouncement(prev => {
                if (prev?.name === name && prev?.claimLabel === label) {
                  return null
                }
                return prev
              })
            }, 5000)
          }).catch(err => console.error("Error celebrating win:", err))
        } else if (claim.status === "rejected" && claim.player_id === playerId) {
          toast.error(`Claim rejected: ${claim.validation_reason}`, { duration: 5000 })
        }
      },
      onClaimSubmitted: (payload) => {
        const claim = payload.new
        if (claim.status === "approved") {
          fetchWinners()
        }
      }
    })

    return () => sub.unsubscribe()
  }, [gameId, playerId, loadData, router, fetchWinners, fetchLeaderboard])

  useEffect(() => {
    if (isGameOver) {
      fetchWinners()
    }
  }, [isGameOver, fetchWinners])

  // Continuous confetti shower on game over - ONLY for winners
  useEffect(() => {
    if (!isGameOver) return

    const isCurrentPlayerWinner = winners.some((w) => w.player_id === playerId)
    if (!isCurrentPlayerWinner) return

    // Trigger initial burst
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    })

    const defaults = { startVelocity: 25, spread: 360, ticks: 60, zIndex: 300 }

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min
    }

    const intervalId = setInterval(() => {
      confetti({ ...defaults, particleCount: 30, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } })
      confetti({ ...defaults, particleCount: 30, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } })
    }, 400)

    return () => clearInterval(intervalId)
  }, [isGameOver, winners, playerId])

  // ============ Decentralized Self-Healing Auto-Call Trigger ============
  useEffect(() => {
    if (!gameData || gameData.status !== "active" || !gameData.auto_call || gameData.paused) return

    const intervalId = setInterval(async () => {
      if (gameData.next_call_at) {
        const nextCallTime = new Date(gameData.next_call_at).getTime()
        // Add 500ms delay to let the host trigger it first if online
        if (Date.now() >= nextCallTime + 500) {
          try {
            await fetch("/api/game/auto-call", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ gameId })
            })
          } catch (err) {
            console.error("Auto-call trigger error:", err)
          }
        }
      }
    }, 2000)

    return () => clearInterval(intervalId)
  }, [gameData, gameId])

  // ============ Actions ============
  const toggleMark = async (cell: BoardCell) => {
    if (cell.isFree || cell.isEmpty) return
    if (failedMarkIds.has(cell.item.id)) return 
    
    const isCorrect = calledValues.has(cell.item.id) || calledValues.has(cell.item.value)
    
    if (!isCorrect) {
      setFailedMarkIds(prev => new Set([...prev, cell.item.id]))
      toast.error("Incorrect Guess! This button is now disabled.", { icon: "❌" })
      return
    }

    const isMarked = markedIds.has(cell.item.id)
    const newMarked = new Set(markedIds)
    
    try {
      if (isMarked) {
        newMarked.delete(cell.item.id)
        await supabase
          .from("player_marks")
          .delete()
          .eq("player_id", playerId)
          .eq("item_id", cell.item.id)
      } else {
        newMarked.add(cell.item.id)
        await supabase
          .from("player_marks")
          .insert({
            player_id: playerId,
            item_id: cell.item.id
          })
      }
      setMarkedIds(newMarked)
      // Leaderboard will update via realtime database subscription
    } catch (error) {
      console.error("Mark update error:", error)
      toast.error("Failed to update mark")
    }
  }

  const handleClaim = async () => {
    if (!selectedClaimType) return
    setIsSubmittingClaim(true)
    
    try {
      const gridConfig = getGridConfig(gameData.ticket_size as TicketSize)
      let claimIndex: number | undefined

      const isAlreadyApproved = (claimType: string, index?: number) =>
        winners.some((c) => {
          if (c.status !== "approved") return false
          const storedType = (c.claim_data as any)?.type || c.claim_type
          if (storedType !== claimType) return false
          const data = (c.claim_data as any) || {}
          if (index !== undefined) return Number(data.index) === index
          return true
        })

      // Resolve index for claims that need one
      if (selectedClaimType === "row") {
        for (let i = 0; i < gridConfig.rows; i++) {
          if (isAlreadyApproved("row", i)) continue
          const res = validateClaim("row", i, board, markedIds, calledValues, gameData.ticket_size as TicketSize)
          if (res.valid) {
            claimIndex = i
            break
          }
        }
      } else if (selectedClaimType === "column") {
        for (let i = 0; i < gridConfig.cols; i++) {
          if (isAlreadyApproved("column", i)) continue
          const res = validateClaim("column", i, board, markedIds, calledValues, gameData.ticket_size as TicketSize)
          if (res.valid) {
            claimIndex = i
            break
          }
        }
      } else if (selectedClaimType === "diagonal") {
        if (!isAlreadyApproved("diagonal", 0)) {
          const d0 = validateClaim("diagonal", 0, board, markedIds, calledValues, gameData.ticket_size as TicketSize)
          if (d0.valid) claimIndex = 0
        }
        if (claimIndex === undefined && !isAlreadyApproved("diagonal", 1)) {
          const d1 = validateClaim("diagonal", 1, board, markedIds, calledValues, gameData.ticket_size as TicketSize)
          if (d1.valid) claimIndex = 1
        }
      } else if (selectedClaimType === "top_row") {
        claimIndex = 0
      } else if (selectedClaimType === "middle_row") {
        claimIndex = Math.floor(gridConfig.rows / 2)
      } else if (selectedClaimType === "bottom_row") {
        claimIndex = gridConfig.rows - 1
      }

      // Submit claim to API
      const response = await fetch("/api/game/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          playerId,
          claimType: selectedClaimType,
          claimIndex
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        toast.error(`Invalid Claim: ${result.reason || result.error}`)
        return
      }

      setPlayerClaims(prev => [...prev, result.claim])
      await fetchWinners()
      toast.success(`Success! Your ${selectedClaimType.replace("_", " ")} claim was approved.`)
      setShowClaimDialog(false)
    } catch (error: any) {
      console.error("Claim submission error:", error)
      toast.error(error.message || "Failed to submit claim")
    } finally {
      setIsSubmittingClaim(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Syncing your board...</p>
      </div>
    )
  }

  const gridConfig = getGridConfig(gameData.ticket_size as TicketSize)
  const progressPercent = Math.round((markedIds.size / board.filter(c => !c.isEmpty && !c.isFree).length) * 100)
  const gameType = (gameData?.game_type as "number" | "bollywood" | "custom") || "number"

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      <div className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-200/60 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/")} className="text-slate-400 hover:text-slate-655 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">BINGO LIVE</span>
              <h1 className="font-extrabold text-sm text-slate-800">{gameData?.game_name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:bg-slate-50" onClick={() => setVoiceEnabled(!voiceEnabled)}>
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            <div className="flex items-center gap-1 bg-[#EFF6FF] px-2 py-1 rounded-full border border-[#DBEAFE]">
              <Radio className="w-3 h-3 text-[#2563EB] animate-pulse" />
              <span className="text-[10px] font-black text-[#2563EB]">LIVE</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        <Card className="border border-slate-200 bg-white shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-0 text-center">
            {gameData.game_type === "bollywood" && lastCalledMapping?.image_url ? (
              <div 
                className="relative h-64 sm:h-72 w-full overflow-hidden cursor-zoom-in"
                onClick={() => setIsZoomOpen(true)}
              >
                <img 
                  src={lastCalledMapping.image_url} 
                  alt="Last Called Movie"
                  className="w-full h-full object-cover animate-in fade-in zoom-in duration-500"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-white font-bold">Click to Zoom</span>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400 mb-2">Last Called</p>
                <div className="text-6xl font-black text-[#2563EB] animate-in zoom-in duration-500">
                  {lastCalled?.item_id || "—"}
                </div>
              </div>
            )}
            <div className="mt-4 flex justify-between items-center text-xs text-slate-500 bg-slate-50 p-3.5 border-t border-slate-100 rounded-b-2xl">
              <div className="flex items-center gap-1">
                <History className="w-3 h-3 text-slate-400" />
                <span>Call #{calledHistory.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Progress</span>
                <div className="w-16 h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#2563EB]" style={{ width: `${progressPercent}%` }} />
                </div>
                <span className="font-bold text-[#2563EB]">{progressPercent}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Leaderboard Widget */}
        <Card className="border border-slate-200 bg-white shadow-sm rounded-2xl overflow-hidden">
          <button 
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500 fill-amber-500/10" />
              <span className="font-extrabold text-sm text-slate-800">Live Leaderboard ({leaderboard.length})</span>
            </div>
            {showLeaderboard ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          
          {showLeaderboard && (
            <CardContent className="p-0 border-t border-slate-100">
              <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                {leaderboard.map((player, index) => {
                  const isMe = player.id === playerId
                  return (
                    <div 
                      key={player.id} 
                      className={`flex items-center justify-between px-4 py-2.5 text-xs ${isMe ? "bg-blue-50/40 font-bold" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-400 w-4">#{index + 1}</span>
                        <span className={isMe ? "text-blue-600" : "text-slate-700"}>{player.name}</span>
                        {isMe && <Badge variant="outline" className="text-[8px] px-1 py-0 bg-blue-50 text-blue-650 border-blue-200 rounded">You</Badge>}
                      </div>
                      <span className="text-slate-500 font-semibold">{player.marks} marks</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Ticket Board Grid */}
        <div 
          className="grid gap-2 sm:gap-3" 
          style={{ 
            gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))` 
          }}
        >
          {board.map((cell) => {
            const isMarked = markedIds.has(cell.item.id)
            const isBollywood = gameData.game_type === "bollywood"
            const isCalled = (calledValues.has(cell.item.id) || calledValues.has(cell.item.value)) && !cell.isFree && !isBollywood
            const isFailed = failedMarkIds.has(cell.item.id)
            
            if (cell.isEmpty) return <div key={cell.id} className="aspect-square opacity-0" />

            return (
              <button
                key={cell.id}
                onClick={() => toggleMark(cell)}
                disabled={isFailed || isMarked}
                className={`
                  aspect-square rounded-lg sm:rounded-xl border-2 transition-all duration-300 relative flex flex-col items-center justify-center overflow-hidden
                  ${cell.isFree ? "border-amber-500 bg-amber-50 text-amber-700" : ""}
                  ${!cell.isFree && isMarked ? "border-green-500 bg-green-50/40 text-green-700 font-bold scale-95 shadow-sm shadow-green-100" : ""}
                  ${!cell.isFree && isFailed ? "border-red-200 bg-red-50/30 text-red-700 opacity-55 cursor-not-allowed" : ""}
                  ${!cell.isFree && !isMarked && !isFailed ? (isCalled ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB] animate-pulse shadow-sm" : "border-slate-200 bg-white hover:border-[#2563EB]/40 hover:shadow-sm text-slate-800") : ""}
                `}
              >
                {cell.isFree ? (
                  <Sparkles className="w-6 h-6 text-amber-500 animate-pulse" />
                ) : (
                  <>
                    {isBollywood ? (
                      <div className="flex h-full w-full flex-col items-center justify-center px-2 py-2 text-center">
                        <span className={`line-clamp-2 text-xs sm:text-sm font-bold leading-tight ${isMarked ? "text-green-700" : isFailed ? "text-red-650" : "text-slate-800"}`}>
                          {cell.item.movieName || cell.item.value}
                        </span>
                      </div>
                    ) : (
                      <span className={`text-base sm:text-2xl font-black ${isMarked ? "text-green-700" : isFailed ? "text-red-650" : isCalled ? "text-[#2563EB]" : "text-slate-800"}`}>
                        {cell.item.value}
                      </span>
                    )}

                    {isMarked && (
                      <div className="absolute top-1 right-1">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                      </div>
                    )}
                    {isFailed && (
                      <div className="absolute top-1 right-1">
                        <X className="w-3 h-3 text-red-500" />
                      </div>
                    )}
                  </>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex justify-between items-center text-xs text-slate-500 px-1">
          <div className="flex items-center gap-2">
            <Info className="w-3 h-3 text-slate-400" />
            <span>{gameData.game_type === "bollywood" ? "Tap a movie card once its number is called to mark it." : "Tap a number once it's called to mark it."}</span>
          </div>
          <Badge variant="outline" className="text-[9px] rounded bg-slate-100 text-slate-700 border-slate-200">
            {gameData.ticket_size} GRID
          </Badge>
        </div>
      </div>

      <div className={`fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC]/95 to-transparent z-40 transition-all duration-500 ${isGameOver ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"}`}>
        <div className="max-w-xl mx-auto flex gap-3">
          <Button 
            size="lg" 
            className="flex-1 h-16 rounded-2xl text-lg font-black shadow-sm bg-[#2563EB] hover:bg-[#1D4ED8] text-white active:scale-95 transition-transform"
            onClick={() => setShowClaimDialog(true)}
          >
            <Trophy className="w-6 h-6 mr-2" />
            CLAIM BINGO
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="h-16 w-16 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            onClick={() => {
              const url = `https://bingo-game-mu-silk.vercel.app/join/${gameData?.game_code}`
              navigator.clipboard.writeText(url)
              toast.success("Link copied! Share with friends.")
            }}
          >
            <Share2 className="w-6 h-6" />
          </Button>
        </div>
      </div>

      <Dialog open={showClaimDialog} onOpenChange={setShowClaimDialog}>
        <DialogContent className="max-w-sm rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Claim Your Win!
            </DialogTitle>
            <DialogDescription>
              Select the pattern you've completed. Our system will auto-validate your claim instantly.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-6">
            {(() => {
              const types: ClaimType[] = [
                "early_five",
                "top_row",
                "middle_row",
                "bottom_row",
                "corners",
                "full_house"
              ]

              return types.map((type) => {
                const info = CLAIM_DISPLAY_INFO[type]
                const claimWinner = winners.find(c => 
                  (c.claim_type === type || (c.claim_data as any)?.type === type) && 
                  c.status === "approved"
                )
                const isClaimed = !!claimWinner
                const isMyClaim = claimWinner?.player_id === playerId
                
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedClaimType(type)}
                    disabled={isClaimed}
                    className={`
                      p-4 rounded-2xl border-2 transition-all text-left flex flex-col justify-between h-28 relative overflow-hidden group
                      ${selectedClaimType === type 
                        ? "border-[#2563EB] bg-[#EFF6FF]/40 shadow-sm" 
                        : "border-slate-200 hover:border-slate-350 hover:bg-slate-50/30"
                      }
                      ${isClaimed 
                        ? isMyClaim 
                          ? "border-green-200 bg-green-50/20 text-green-700 cursor-not-allowed" 
                          : "border-slate-200 bg-slate-50/60 opacity-60 cursor-not-allowed"
                        : ""
                      }
                    `}
                  >
                    <div className="flex flex-col gap-1">
                      <span className={`text-2xl transition-transform duration-300 ${!isClaimed && "group-hover:scale-110"}`}>{info.icon}</span>
                      <span className={`font-bold text-xs tracking-tight ${isMyClaim ? "text-green-800" : isClaimed ? "text-slate-550" : "text-slate-800"}`}>
                        {info.label}
                      </span>
                    </div>
                    
                    {isClaimed ? (
                      isMyClaim ? (
                        <div className="flex items-center gap-1 mt-auto">
                          <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                          <span className="text-[9px] font-black uppercase text-green-600 tracking-wider">YOURS!</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 mt-auto min-w-0">
                          <Trophy className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="text-[9px] font-bold text-slate-400 truncate uppercase tracking-wider">
                            {claimWinner.players?.display_name || "Claimed"}
                          </span>
                        </div>
                      )
                    ) : null}

                    {isClaimed && isMyClaim && (
                      <div className="absolute top-2 right-2">
                        <div className="bg-green-100 text-green-700 p-0.5 rounded-full border border-green-200">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      </div>
                    )}
                    {isClaimed && !isMyClaim && (
                      <div className="absolute top-2 right-2">
                        <div className="bg-slate-200 text-slate-600 p-0.5 rounded-full border border-slate-300">
                          <X className="w-2.5 h-2.5" />
                        </div>
                      </div>
                    )}
                  </button>
                )
              })
            })()}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button 
              className="w-full h-12 rounded-xl font-bold" 
              onClick={handleClaim}
              disabled={!selectedClaimType || isSubmittingClaim}
            >
              {isSubmittingClaim ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Submit Claim
            </Button>
            <Button 
              variant="ghost" 
              className="w-full h-12 rounded-xl text-muted-foreground"
              onClick={() => setShowClaimDialog(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isGameOver && (
        <div className="fixed inset-0 z-[200] bg-[#F8FAFC]/95 backdrop-blur-2xl overflow-y-auto p-4 sm:p-8 flex flex-col items-center animate-in fade-in duration-500">
          <div className="w-full max-w-4xl space-y-8 text-center relative z-10 my-auto py-8">
            <div className="space-y-4">
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl flex items-center justify-center mx-auto relative shadow-md animate-pulse">
                <Trophy className="w-10 h-10 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]" />
                <div className="absolute -inset-1.5 rounded-2xl border-2 border-yellow-500/30 animate-ping opacity-20" />
              </div>
              <div className="space-y-1">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter italic uppercase text-slate-800">
                  GAME OVER!
                </h1>
                <p className="text-slate-400 text-xs uppercase font-extrabold tracking-widest">
                  Performance Analysis Complete
                </p>
                <p className="text-xs font-bold text-slate-500 mt-1">
                  Final results for <span className="text-slate-900 font-black">{gameData?.game_name}</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div className="space-y-6">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">
                  Your Performance
                </h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-white border border-slate-200/60 shadow-sm rounded-2xl transition-transform duration-300 hover:scale-[1.02]">
                    <CardContent className="pt-6 pb-6 text-center">
                      <p className="text-4xl sm:text-5xl font-black text-[#2563EB]">
                        {markedIds.size}
                      </p>
                      <p className="text-xs font-black text-slate-800 mt-2 uppercase tracking-wide">Points</p>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-0.5">Matched Cells</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-white border border-slate-200/60 shadow-sm rounded-2xl transition-transform duration-300 hover:scale-[1.02]">
                    <CardContent className="pt-6 pb-6 text-center">
                      <p className="text-4xl sm:text-5xl font-black text-[#2563EB]">
                        {checkBingo(board, markedIds, gameData?.ticket_size).length}
                      </p>
                      <p className="text-xs font-black text-slate-800 mt-2 uppercase tracking-wide">Lines</p>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-0.5">Completed Lines</p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-white border border-slate-200/60 shadow-sm rounded-2xl relative overflow-hidden transition-transform duration-300 hover:scale-[1.02]">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Sparkles className="w-16 h-16 text-[#2563EB]" />
                  </div>
                  <CardContent className="p-5">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-2">
                      <span className="uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                        Match Rate
                      </span>
                      <span className="font-black text-sm text-[#2563EB]">
                        {Math.round((markedIds.size / Math.max(calledValues.size, 1)) * 100)}% Accuracy
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/50 mb-2">
                      <div 
                        className="h-full bg-[#2563EB] transition-all duration-1000 ease-out" 
                        style={{ width: `${Math.min(100, (markedIds.size / Math.max(calledValues.size, 1)) * 100)}%` }} 
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Percentage of called numbers that you correctly marked on your board.
                    </p>
                  </CardContent>
                </Card>

                {/* Game Stats */}
                <Card className="bg-white border border-slate-200/60 shadow-sm rounded-2xl">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-3">
                      <span className="uppercase tracking-wider flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-slate-400" />
                        Game Stats
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                        <p className="text-[9px] uppercase font-black tracking-widest text-slate-400">Total Calls</p>
                        <p className="text-2xl font-black text-slate-800 mt-1">{calledHistory.length}</p>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                        <p className="text-[9px] uppercase font-black tracking-widest text-slate-400">Mode</p>
                        <p className="text-base font-black text-slate-800 mt-1.5 capitalize truncate">{gameData?.game_type}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Activity (Leaderboard) */}
                <Card className="bg-white border border-slate-200/60 shadow-sm rounded-2xl overflow-hidden">
                  <CardHeader className="py-3 px-5 border-b border-slate-100 bg-slate-50/50">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-455 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      Top Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y text-xs max-h-36 overflow-y-auto">
                      {leaderboard.slice(0, 5).map((p, idx) => {
                        const isMe = p.id === playerId
                        return (
                          <div key={idx} className={`flex items-center justify-between p-3.5 transition-colors ${isMe ? "bg-blue-50/30" : ""}`}>
                            <span className={`font-bold ${isMe ? "text-blue-600" : "text-slate-700"}`}>
                              {p.name} {isMe && "(You)"}
                            </span>
                            <Badge variant="secondary" className="font-black px-2 py-0.5 text-[10px] bg-blue-50 text-blue-700 border-blue-200 rounded-full">
                              {p.marks} marks
                            </Badge>
                          </div>
                        )
                      })}
                      {leaderboard.length === 0 && (
                        <div className="p-6 text-center text-slate-400 italic text-[10px]">
                          No player activity data available.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="pt-2 space-y-4">
                  <Button 
                    className="w-full h-14 rounded-2xl font-black text-lg text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-sm hover:scale-[1.02] active:scale-95 transition-all duration-300"
                    onClick={() => router.push("/")}
                  >
                    Return to Lobby
                  </Button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 animate-pulse" />
                    Champions Board
                  </h2>
                  <Badge variant="outline" className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wide bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE] rounded-full">
                    Verified Winners
                  </Badge>
                </div>

                <Card className="border border-slate-200/60 bg-white shadow-sm overflow-hidden rounded-2xl flex flex-col min-h-[280px]">
                  <CardHeader className="py-4 px-5 border-b border-slate-100 bg-slate-50/50">
                    <CardTitle className="text-xs font-black text-slate-500 flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-yellow-500" />
                      LATEST WINNERS
                    </CardTitle>
                    <CardDescription className="text-[10px]">First players to submit valid bingo claims</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 overflow-y-auto max-h-[350px]">
                    {(() => {
                      const types = [
                        "early_five",
                        "top_row",
                        "middle_row",
                        "bottom_row",
                        "corners",
                        "full_house"
                      ] as const

                      return (
                        <div className="divide-y divide-slate-100">
                          {types.map((type) => {
                            const info = CLAIM_DISPLAY_INFO[type]
                            const claimWinner = winners.find(win => {
                              const uiType = (win.claim_data as any)?.type || win.claim_type
                              return uiType === type
                            })
                            const isCurrentUser = claimWinner?.player_id === playerId
                            const savedPrizes = typeof window !== 'undefined' ? localStorage.getItem("prizes_" + gameId) : null
                            const prizesObj = gameData?.prizes || (savedPrizes ? JSON.parse(savedPrizes) : {})
                            const prize = prizesObj[type]

                            return (
                              <div 
                                key={type} 
                                className={`flex items-center justify-between p-3.5 hover:bg-slate-50/30 transition-colors ${
                                  isCurrentUser ? "bg-blue-50/30 border-l-4 border-l-blue-500" : ""
                                }`}
                              >
                                <div className="flex items-center gap-3.5 min-w-0">
                                  <span className="text-2xl flex-shrink-0">{info?.icon || "🏆"}</span>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-extrabold text-sm text-slate-800">
                                        {info?.label || type}
                                      </p>
                                    </div>
                                    {prize && (
                                      <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded-full mt-1.5 animate-in fade-in max-w-[150px] truncate">
                                        <span>🎁</span>
                                        <span className="uppercase tracking-wider text-[8px] text-amber-500/80 mr-0.5">Prize:</span>
                                        {prize}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {claimWinner ? (
                                    <div className="flex flex-col items-end gap-0.5">
                                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold px-2 py-0.5 text-[10px] rounded-full flex items-center gap-1">
                                        <Trophy className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
                                        <span className="truncate max-w-[80px] sm:max-w-[120px]">{claimWinner.players?.display_name || "Winner"}</span>
                                      </Badge>
                                      {isCurrentUser && (
                                        <span className="text-[8px] font-black text-blue-600 tracking-wider">YOUR WIN!</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-bold bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-full">
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
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Real-time Bingo Win Announcement Overlay */}
      {announcement && (
        <div className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white border-2 border-yellow-400 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-500">
            {/* Background design pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#eab308_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md animate-bounce">
              <Trophy className="w-8 h-8 text-white drop-shadow" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight italic">
              BINGO CLAIMED!
            </h3>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">
              Pattern Verified
            </p>
            <div className="mt-4 p-4 bg-slate-50 border rounded-2xl">
              <p className="text-xl font-black text-[#2563EB]">
                {announcement.name}
              </p>
              <p className="text-xs font-extrabold text-slate-650 mt-1">
                Completed: {announcement.claimLabel}
              </p>
              {announcement.prize && (
                <p className="text-xs font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full mt-2 inline-block">
                  🎁 Prize: {announcement.prize}
                </p>
              )}
            </div>
            <Button
              className="mt-6 w-full h-11 rounded-xl font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
              onClick={() => setAnnouncement(null)}
            >
              AWESOME!
            </Button>
          </div>
        </div>
      )}
      </div>
  )
}
