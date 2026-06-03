"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
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
  LogOut, 
  CheckCircle2, 
  Gamepad2, 
  Radio,
  ChevronLeft,
  Info,
  History,
  X,
  Zap,
  Sparkles,
  Star,
  Crown,
  Award,
  Check,
  TrendingUp
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { 
  TicketSize, 
  BoardCell, 
  WinningLine, 
  checkBingo, 
  getRowProgress,
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
  const mappingsRef = useRef<any[]>([])
  const hasLoadedRef = useRef(false)
  
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
      if (gData.status === "ended") {
        setGameData(gData)
        setIsGameOver(true)
        // We continue loading to show the final board/scores
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

      // 3. Fetch Bollywood Mappings (Needed for both generation and reconstruction)
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
        // Generate new ticket
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
        
        // Persist to DB
        const { error: insertError } = await supabase.from("player_tickets").insert({
          player_id: playerId,
          game_id: gameId,
          ticket_data: generated.ticketData
        })

        // If insert failed because it already exists (race condition), fetch it again
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

      // Fetch all winners (approved claims) for the game to disable claimed options
      await fetchWinners()

    } catch (error) {
      console.error("Load error:", error)
      toast.error("Failed to load game")
      router.push("/")
    } finally {
      setIsLoading(false)
    }
  }, [gameId, playerId, router, setPlayerIdentity, fetchWinners]) // Removed bollywoodMappings from deps

  useEffect(() => {
    loadData()
    
    const sub = subscribeToGame(gameId, {
      onNumberCalled: (payload) => {
        const item = payload.new
        setCalledValues(prev => new Set([...prev, item.item_id]))
        setCalledHistory(prev => [...prev, item])
        setLastCalled(item)
        
        // Use Reference to avoid loop dependency
        if (mappingsRef.current.length > 0) {
          const mapping = mappingsRef.current.find(m => m.number.toString() === item.item_id.toString())
          setLastCalledMapping(mapping)
        }
        toast.info(`New number: ${item.item_id}`, { position: "top-center" })
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
          if (claim.status === "approved") {
            toast.success("BINGO! Your claim was approved!", { duration: 5000 })
            fetchWinners()
          } else if (claim.status === "rejected") {
            toast.error(`Claim rejected: ${claim.validation_reason}`, { duration: 5000 })
          }
        } else if (claim.status === "approved") {
          fetchWinners()
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
  }, [gameId, playerId, loadData, router, fetchWinners])

  useEffect(() => {
    if (isGameOver) {
      fetchWinners()
    }
  }, [isGameOver, fetchWinners])

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

      // 1) Resolve index for claims that need one
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

      // 2) Game-wide duplicate guard
      const existingWinner = winners.find((c) => {
        if (c.status !== "approved") return false
        const storedType = (c.claim_data as any)?.type || c.claim_type
        if (storedType !== selectedClaimType) return false
        const data = (c.claim_data as any) || {}
        if (claimIndex !== undefined) return Number(data.index) === claimIndex
        return true
      })

      if (existingWinner) {
        if (existingWinner.player_id === playerId) {
          toast.error("You have already won this prize!")
        } else {
          toast.error(`This prize has already been claimed by ${existingWinner.players?.display_name || "another player"}!`)
        }
        return
      }

      const result = validateClaim(selectedClaimType, claimIndex, board, markedIds, calledValues, gameData.ticket_size as TicketSize)

      if (!result.valid) {
        toast.error(`Invalid Claim: ${result.reason}`)
        return
      }

      const claimPayload: Record<string, any> = {
          game_id: gameId,
          player_id: playerId,
          claim_type: selectedClaimType,
          claim_data: { 
            index: claimIndex, 
            type: selectedClaimType, 
            cells: result.claimedCells.map(c => c.item.id) 
          },
          is_valid: true,
          validation_reason: result.reason,
          status: "approved"
      }

      let { data: newClaim, error } = await supabase
        .from("claims")
        .insert(claimPayload)
        .select()
        .single()
      
      // Fallback: if claim_data column doesn't exist in DB, retry without it
      if (error && error.message?.includes("claim_data")) {
        console.warn("claim_data column not found, retrying without it. Please add 'claim_data jsonb' column to your claims table.")
        const { claim_data, ...payloadWithout } = claimPayload
        const retry = await supabase
          .from("claims")
          .insert(payloadWithout)
          .select()
          .single()
        newClaim = retry.data
        error = retry.error
      }

      if (error) {
        console.error("Supabase Claim Error Details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      setPlayerClaims(prev => [...prev, newClaim])
      await fetchWinners()
      toast.success(`Success! Your ${selectedClaimType.replace("_", " ")} claim was approved.`)
      setShowClaimDialog(false)
    } catch (error: any) {
      console.error("Claim submission catch block:", error)
      const errorMessage = error?.message || error?.details || "Failed to submit claim"
      toast.error(`Claim Error: ${errorMessage}`)
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
  const theme = {
    number: {
      accent: "blue",
      glow: "shadow-sm",
      badgeBg: "bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]",
      btnColor: "bg-[#2563EB] hover:bg-[#1D4ED8]",
      gradientOrb: "hidden",
      accentText: "text-[#2563EB]",
      bgAccent: "bg-[#2563EB]",
      border: "border-slate-200/60",
      bgGradient: "bg-white",
      titleGradient: "from-slate-800 to-slate-950",
    },
    bollywood: {
      accent: "amber",
      glow: "shadow-sm",
      badgeBg: "bg-amber-50 text-amber-600 border border-amber-200",
      btnColor: "bg-[#2563EB] hover:bg-[#1D4ED8]",
      gradientOrb: "hidden",
      accentText: "text-amber-600",
      bgAccent: "bg-amber-500",
      border: "border-slate-200/60",
      bgGradient: "bg-white",
      titleGradient: "from-slate-800 to-slate-950",
    },
    custom: {
      accent: "purple",
      glow: "shadow-sm",
      badgeBg: "bg-purple-50 text-purple-600 border border-purple-200",
      btnColor: "bg-[#2563EB] hover:bg-[#1D4ED8]",
      gradientOrb: "hidden",
      accentText: "text-purple-600",
      bgAccent: "bg-purple-500",
      border: "border-slate-200/60",
      bgGradient: "bg-white",
      titleGradient: "from-slate-800 to-slate-950",
    },
  }[gameType] || {
    accent: "neutral",
    glow: "shadow-sm",
    badgeBg: "bg-slate-50 text-slate-700 border border-slate-200",
    btnColor: "bg-slate-900 hover:bg-slate-800",
    gradientOrb: "hidden",
    accentText: "text-slate-900",
    bgAccent: "bg-slate-900",
    border: "border-slate-200/60",
    bgGradient: "bg-white",
    titleGradient: "from-slate-800 to-slate-950",
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      <div className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-200/60 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/")} className="text-slate-450 hover:text-slate-650 transition-colors">
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
            <div className="mt-4 flex justify-between items-center text-xs text-slate-550 bg-slate-50 p-3.5 border-t border-slate-100 rounded-b-2xl">
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

        <div 
          className="grid gap-2 sm:gap-3" 
          style={{ 
            gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))` 
          }}
        >
          {board.map((cell) => {
            const isMarked = markedIds.has(cell.item.id)
            const isCalled = (calledValues.has(cell.item.id) || calledValues.has(cell.item.value)) && !cell.isFree
            const isFailed = failedMarkIds.has(cell.item.id)
            const isBollywood = gameData.game_type === "bollywood"
            
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
                        <span className={`text-[10px] sm:text-xs font-black tracking-wide ${isMarked ? "text-green-600" : isFailed ? "text-red-500" : isCalled ? "text-[#2563EB]" : "text-slate-400"}`}>
                          #{cell.item.value}
                        </span>
                        <span className={`mt-1 line-clamp-2 text-xs sm:text-sm font-bold leading-tight ${isMarked ? "text-green-700" : isFailed ? "text-red-650" : "text-slate-800"}`}>
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

        <div className="flex justify-between items-center text-xs text-slate-450 px-1">
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
              const url = window.location.href
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
                      <span className={`font-bold text-xs tracking-tight ${isMyClaim ? "text-green-800" : isClaimed ? "text-slate-500" : "text-slate-800"}`}>
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
                          <Trophy className="w-3 h-3 text-slate-450 flex-shrink-0" />
                          <span className="text-[9px] font-bold text-slate-450 truncate uppercase tracking-wider">
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
        <div className="fixed inset-0 z-[200] bg-[#F8FAFC]/95 backdrop-blur-2xl flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-500">
          <div className="w-full max-w-4xl space-y-8 text-center relative z-10 py-8 scroll-py-8">
            {/* Header Hero */}
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

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              {/* Left Column: Stats & Actions */}
              <div className="space-y-6">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">
                  Your Performance
                </h2>
                
                {/* Personal scorecard metrics */}
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

                {/* Match Accuracy Tracker Card */}
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

                {/* Return Actions */}
                <div className="pt-2 space-y-4">
                  <Button 
                    className="w-full h-14 rounded-2xl font-black text-lg text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-sm hover:scale-[1.02] active:scale-95 transition-all duration-300"
                    onClick={() => router.push("/")}
                  >
                    Return to Lobby
                  </Button>
                  <p className="text-[10px] font-bold text-slate-350 uppercase tracking-[0.2em] text-center">
                    Bingo Visual Recognition Engine v1.0
                  </p>
                </div>
              </div>

              {/* Right Column: Champions Board / Winner Display */}
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
    </div>
  )
}
