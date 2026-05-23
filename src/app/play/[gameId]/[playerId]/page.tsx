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
import { validateClaim, ClaimType } from "@/lib/claim-validator"
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

    } catch (error) {
      console.error("Load error:", error)
      toast.error("Failed to load game")
      router.push("/")
    } finally {
      setIsLoading(false)
    }
  }, [gameId, playerId, router, setPlayerIdentity]) // Removed bollywoodMappings from deps

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
        toast.info(`New number: ${item.item_id}`, { position: "bottom-center" })
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

      // DB enum only supports these; keep richer UI claim type in claim_data.type
      const dbClaimType: "row" | "column" | "diagonal" | "full_house" =
        selectedClaimType === "top_row" || selectedClaimType === "middle_row" || selectedClaimType === "bottom_row"
          ? "row"
          : selectedClaimType === "row" || selectedClaimType === "column" || selectedClaimType === "diagonal" || selectedClaimType === "full_house"
            ? selectedClaimType
            : "full_house"

      const isApprovedDuplicate = (dbType: string, index?: number, uiType?: string) =>
        playerClaims.some((c) => {
          if (c.status !== "approved" || c.claim_type !== dbType) return false
          const data = (c.claim_data as any) || {}
          if (index !== undefined) return Number(data.index) === index
          if (uiType) return data.type === uiType
          return true
        })

      // 1) Resolve index for claims that need one
      if (selectedClaimType === "row") {
        for (let i = 0; i < gridConfig.rows; i++) {
          if (isApprovedDuplicate("row", i)) continue
          const res = validateClaim("row", i, board, markedIds, calledValues, gameData.ticket_size as TicketSize)
          if (res.valid) {
            claimIndex = i
            break
          }
        }
      } else if (selectedClaimType === "column") {
        for (let i = 0; i < gridConfig.cols; i++) {
          if (isApprovedDuplicate("column", i)) continue
          const res = validateClaim("column", i, board, markedIds, calledValues, gameData.ticket_size as TicketSize)
          if (res.valid) {
            claimIndex = i
            break
          }
        }
      } else if (selectedClaimType === "diagonal") {
        if (!isApprovedDuplicate("diagonal", 0)) {
          const d0 = validateClaim("diagonal", 0, board, markedIds, calledValues, gameData.ticket_size as TicketSize)
          if (d0.valid) claimIndex = 0
        }
        if (claimIndex === undefined && !isApprovedDuplicate("diagonal", 1)) {
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

      // 2) Local duplicate guard
      const isDup =
        claimIndex !== undefined
          ? isApprovedDuplicate(dbClaimType, claimIndex)
          : isApprovedDuplicate(dbClaimType, undefined, selectedClaimType)

      if (isDup) {
        toast.error("You have already won this prize!")
        return
      }

      const result = validateClaim(selectedClaimType, claimIndex, board, markedIds, calledValues, gameData.ticket_size as TicketSize)

      if (!result.valid) {
        toast.error(`Invalid Claim: ${result.reason}`)
        return
      }

      const { data: newClaim, error } = await supabase
        .from("claims")
        .insert({
          game_id: gameId,
          player_id: playerId,
          claim_type: dbClaimType,
          claim_data: { 
            index: claimIndex, 
            type: selectedClaimType, 
            cells: result.claimedCells.map(c => c.item.id) 
          },
          is_valid: true,
          validation_reason: result.reason,
          status: "approved"
        })
        .select()
        .single()
      
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
      glow: "shadow-blue-500/20 shadow-lg hover:shadow-blue-500/30",
      badgeBg: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      btnColor: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
      gradientOrb: "bg-blue-500/10",
      accentText: "text-blue-600 dark:text-blue-400",
      bgAccent: "bg-blue-500",
      border: "border-blue-500/20",
      bgGradient: "from-blue-600/10 to-indigo-600/10",
      titleGradient: "from-blue-400 via-indigo-500 to-purple-600",
    },
    bollywood: {
      accent: "amber",
      glow: "shadow-amber-500/20 shadow-lg hover:shadow-amber-500/30",
      badgeBg: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      btnColor: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500",
      gradientOrb: "bg-amber-500/10",
      accentText: "text-amber-600 dark:text-amber-400",
      bgAccent: "bg-amber-500",
      border: "border-amber-500/20",
      bgGradient: "from-amber-600/10 to-rose-600/10",
      titleGradient: "from-amber-400 via-rose-500 to-red-600",
    },
    custom: {
      accent: "purple",
      glow: "shadow-purple-500/20 shadow-lg hover:shadow-purple-500/30",
      badgeBg: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      btnColor: "bg-purple-600 hover:bg-purple-700 focus:ring-purple-500",
      gradientOrb: "bg-purple-500/10",
      accentText: "text-purple-600 dark:text-purple-400",
      bgAccent: "bg-purple-500",
      border: "border-purple-500/20",
      bgGradient: "from-purple-600/10 to-pink-600/10",
      titleGradient: "from-purple-400 via-pink-500 to-rose-600",
    },
  }[gameType] || {
    accent: "neutral",
    glow: "shadow-neutral-500/20 shadow-lg",
    badgeBg: "bg-neutral-500/10 text-neutral-500 border-neutral-500/20",
    btnColor: "bg-primary hover:bg-primary/90 focus:ring-primary",
    gradientOrb: "bg-primary/5",
    accentText: "text-primary",
    bgAccent: "bg-primary",
    border: "border-neutral-500/20",
    bgGradient: "from-primary/5 to-secondary/5",
    titleGradient: "from-primary to-secondary",
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/")} className="text-muted-foreground">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">BINGO LIVE</span>
              <h1 className="font-extrabold text-sm">{gameData?.game_name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setVoiceEnabled(!voiceEnabled)}>
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-full border border-primary/20">
              <Radio className="w-3 h-3 text-primary animate-pulse" />
              <span className="text-[10px] font-black text-primary">LIVE</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-background to-secondary/10 shadow-lg relative overflow-hidden">
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
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-white font-bold">Click to Zoom</span>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground mb-2">Last Called</p>
                <div className="text-6xl font-black text-primary animate-in zoom-in duration-500">
                  {lastCalled?.item_id || "—"}
                </div>
              </div>
            )}
            <div className="mt-4 flex justify-between items-center text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg">
              <div className="flex items-center gap-1">
                <History className="w-3 h-3" />
                <span>Call #{calledHistory.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Progress</span>
                <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${progressPercent}%` }} />
                </div>
                <span className="font-bold text-primary">{progressPercent}%</span>
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
                  ${cell.isFree ? "border-yellow-500 bg-yellow-500/10" : ""}
                  ${!cell.isFree && isMarked ? "border-green-500 bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.3)] scale-95" : ""}
                  ${!cell.isFree && isFailed ? "border-destructive bg-destructive/10 opacity-50 cursor-not-allowed grayscale" : ""}
                  ${!cell.isFree && !isMarked && !isFailed ? "border-border/50 bg-muted/10 hover:border-primary/50" : ""}
                  ${!isBollywood && !isMarked && isCalled ? "border-primary/50 animate-pulse shadow-lg" : ""}
                `}
              >
                {cell.isFree ? (
                  <Sparkles className="w-6 h-6 text-yellow-500 animate-pulse" />
                ) : (
                  <>
                    {isBollywood ? (
                      <div className="flex h-full w-full flex-col items-center justify-center px-2 py-2 text-center">
                        <span className={`text-[10px] sm:text-xs font-black tracking-wide ${isMarked ? "text-green-600" : isFailed ? "text-destructive" : "text-primary/70"}`}>
                          #{cell.item.value}
                        </span>
                        <span className={`mt-1 line-clamp-2 text-xs sm:text-sm font-bold leading-tight ${isMarked ? "text-green-700" : isFailed ? "text-destructive" : "text-foreground"}`}>
                          {cell.item.movieName || cell.item.value}
                        </span>
                      </div>
                    ) : (
                      <span className={`text-base sm:text-2xl font-black ${isMarked ? "text-primary" : "text-foreground"}`}>
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
                        <X className="w-3 h-3 text-destructive" />
                      </div>
                    )}
                  </>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
          <div className="flex items-center gap-2">
            <Info className="w-3 h-3" />
            <span>{gameData.game_type === "bollywood" ? "Tap a movie card once its number is called to mark it." : "Tap a number once it's called to mark it."}</span>
          </div>
          <Badge variant="outline" className="text-[9px]">
            {gameData.ticket_size} GRID
          </Badge>
        </div>
      </div>

      <div className={`fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/90 to-transparent z-40 transition-all duration-500 ${isGameOver ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"}`}>
        <div className="max-w-xl mx-auto flex gap-3">
          <Button 
            size="lg" 
            className="flex-1 h-16 rounded-2xl text-lg font-black shadow-xl shadow-primary/20 active:scale-95 transition-transform bg-primary"
            onClick={() => setShowClaimDialog(true)}
          >
            <Trophy className="w-6 h-6 mr-2" />
            CLAIM BINGO
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="h-16 w-16 rounded-2xl border-2"
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
              const types: { type: ClaimType; label: string; icon: any }[] = []
              
              if (gameData.ticket_size === "3x9") {
                types.push(
                  { type: "top_row", label: "Top Line", icon: History },
                  { type: "middle_row", label: "Middle Line", icon: Radio },
                  { type: "bottom_row", label: "Bottom Line", icon: History },
                  { type: "early_five", label: "Early 5", icon: Zap },
                  { type: "corners", label: "Four Corners", icon: Sparkles },
                  { type: "full_house", label: "Full House", icon: Trophy }
                )
              } else if (gameData.ticket_size === "5x5") {
                types.push(
                  { type: "row", label: "Any Row", icon: History },
                  { type: "column", label: "Any Column", icon: Radio },
                  { type: "diagonal", label: "Diagonal", icon: Sparkles },
                  { type: "early_five", label: "Early 5", icon: Zap },
                  { type: "corners", label: "Four Corners", icon: Sparkles },
                  { type: "full_house", label: "Full House", icon: Trophy }
                )
              } else {
                types.push(
                  { type: "row", label: "Row", icon: History },
                  { type: "early_five", label: "Early 5", icon: Zap },
                  { type: "full_house", label: "Full House", icon: Trophy }
                )
              }

              return types.map(({ type, label, icon: Icon }) => {
                const isClaimed = playerClaims.some(c => 
                  (c.claim_type === type || (c.claim_data as any)?.type === type) && 
                  c.status === "approved"
                )
                
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedClaimType(type)}
                    disabled={isClaimed}
                    className={`
                      p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-2 relative overflow-hidden
                      ${selectedClaimType === type ? "border-primary bg-primary/5" : "border-border hover:border-primary/20"}
                      ${isClaimed ? "opacity-50 grayscale cursor-not-allowed bg-muted/20" : ""}
                    `}
                  >
                    <Icon className={`w-5 h-5 ${selectedClaimType === type ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="font-bold text-sm capitalize">{label}</span>
                    {isClaimed && (
                      <div className="absolute top-1 right-1">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
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

      {/* Game Over Results Overlay - Redesigned */}
      {isGameOver && (
        <div className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-2xl flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-500">
          {/* Background Decor Orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <div className={`absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[120px] animate-pulse transition-colors duration-1000 ${theme.gradientOrb}`} />
            <div className={`absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full blur-[150px] animate-pulse transition-colors duration-1000 ${theme.gradientOrb}`} style={{ animationDelay: "2s" }} />
          </div>

          <div className="w-full max-w-4xl space-y-8 text-center relative z-10 py-8 scroll-py-8">
            {/* Header Hero */}
            <div className="space-y-4">
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto relative shadow-xl shadow-yellow-500/10 animate-pulse">
                <Trophy className="w-10 h-10 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.2)]" />
                <div className="absolute -inset-1.5 rounded-2xl border-2 border-yellow-500/30 animate-ping opacity-20" />
              </div>
              <div className="space-y-1">
                <h1 className={`text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter italic uppercase bg-gradient-to-r ${theme.titleGradient} bg-clip-text text-transparent`}>
                  GAME OVER!
                </h1>
                <p className="text-muted-foreground text-xs uppercase font-extrabold tracking-widest">
                  Performance Analysis Complete
                </p>
                <p className="text-xs font-bold text-muted-foreground/80 mt-1">
                  Final results for <span className="text-foreground font-black">{gameData?.game_name}</span>
                </p>
              </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              {/* Left Column: Stats & Actions */}
              <div className="space-y-6">
                <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground/80 px-1">
                  Your Performance
                </h2>
                
                {/* Personal scorecard metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-card/40 backdrop-blur-md border border-border/60 shadow-sm rounded-2xl transition-transform duration-300 hover:scale-[1.02]">
                    <CardContent className="pt-6 pb-6 text-center">
                      <p className={`text-4xl sm:text-5xl font-black bg-gradient-to-br ${theme.titleGradient} bg-clip-text text-transparent`}>
                        {markedIds.size}
                      </p>
                      <p className="text-xs font-black text-foreground mt-2 uppercase tracking-wide">Points</p>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-0.5">Matched Cells</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-card/40 backdrop-blur-md border border-border/60 shadow-sm rounded-2xl transition-transform duration-300 hover:scale-[1.02]">
                    <CardContent className="pt-6 pb-6 text-center">
                      <p className={`text-4xl sm:text-5xl font-black bg-gradient-to-br ${theme.titleGradient} bg-clip-text text-transparent`}>
                        {checkBingo(board, markedIds, gameData?.ticket_size).length}
                      </p>
                      <p className="text-xs font-black text-foreground mt-2 uppercase tracking-wide">Lines</p>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-0.5">Completed Lines</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Match Accuracy Tracker Card */}
                <Card className="bg-card/40 backdrop-blur-md border border-border/60 shadow-sm rounded-2xl relative overflow-hidden transition-transform duration-300 hover:scale-[1.02]">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Sparkles className="w-16 h-16 text-foreground" />
                  </div>
                  <CardContent className="p-5">
                    <div className="flex justify-between items-center text-xs font-bold text-foreground mb-2">
                      <span className="uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                        Match Rate
                      </span>
                      <span className={`font-black text-sm ${theme.accentText}`}>
                        {Math.round((markedIds.size / Math.max(calledValues.size, 1)) * 100)}% Accuracy
                      </span>
                    </div>
                    <div className="w-full bg-muted/60 dark:bg-muted/30 rounded-full h-2.5 overflow-hidden border border-border/50 mb-2">
                      <div 
                        className={`h-full bg-gradient-to-r ${theme.titleGradient} transition-all duration-1000 ease-out`} 
                        style={{ width: `${Math.min(100, (markedIds.size / Math.max(calledValues.size, 1)) * 100)}%` }} 
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Percentage of called numbers that you correctly marked on your board.
                    </p>
                  </CardContent>
                </Card>

                {/* Return Actions */}
                <div className="pt-2 space-y-4">
                  <Button 
                    className={`w-full h-14 rounded-2xl font-black text-lg text-white shadow-xl hover:scale-[1.02] active:scale-95 transition-all duration-300 ${theme.btnColor} ${theme.glow}`}
                    onClick={() => router.push("/")}
                  >
                    Return to Lobby
                  </Button>
                  <p className="text-[10px] font-bold text-muted-foreground/45 uppercase tracking-[0.2em] text-center">
                    Bingo Visual Recognition Engine v1.0
                  </p>
                </div>
              </div>

              {/* Right Column: Champions Board / Winner Display */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground/80 flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 animate-pulse" />
                    Champions Board
                  </h2>
                  <Badge variant="outline" className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wide border-current ${theme.badgeBg}`}>
                    Verified Winners
                  </Badge>
                </div>

                <Card className="border border-border/80 bg-card/60 backdrop-blur-md shadow-lg overflow-hidden rounded-2xl flex flex-col min-h-[280px]">
                  <CardHeader className="py-4 px-5 border-b border-border/40 bg-muted/20">
                    <CardTitle className="text-xs font-black text-muted-foreground flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-yellow-500" />
                      LATEST WINNERS
                    </CardTitle>
                    <CardDescription className="text-[10px]">First players to submit valid bingo claims</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 overflow-y-auto max-h-[280px]">
                    {winners.length > 0 ? (
                      <div className="divide-y divide-border/30">
                        {winners.map((win, idx) => {
                          const isCurrentUser = win.player_id === playerId
                          const rankColor = idx === 0 
                            ? "bg-yellow-500 text-white border-yellow-400 animate-pulse" 
                            : idx === 1 
                            ? "bg-slate-300 text-slate-800 border-slate-200" 
                            : idx === 2 
                            ? "bg-amber-600 text-white border-amber-500" 
                            : "bg-muted text-muted-foreground border-border"

                          return (
                            <div 
                              key={win.id} 
                              className={`flex items-center justify-between p-3.5 hover:bg-muted/10 transition-colors ${
                                isCurrentUser ? "bg-primary/5 border-l-4 border-l-yellow-500" : ""
                              }`}
                            >
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div className={`w-8 h-8 rounded-full border-2 ${rankColor} flex items-center justify-center font-black text-xs flex-shrink-0 shadow-sm`}>
                                  {idx + 1}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-extrabold text-sm text-foreground truncate max-w-[140px] sm:max-w-[200px]">
                                      {win.players?.display_name || "Unknown Player"}
                                    </p>
                                    {isCurrentUser && (
                                      <Badge className="bg-yellow-500 hover:bg-yellow-600 text-[8px] font-black tracking-wider px-1.5 py-0 h-4 uppercase">
                                        YOU
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <Badge variant="secondary" className="text-[9px] uppercase px-1.5 py-0 font-bold mt-0.5">
                                      {win.claim_type.replace(/_/g, " ")}
                                    </Badge>
                                    {win.claim_data?.type && win.claim_data.type !== win.claim_type && (
                                      <span className="text-[9px] text-muted-foreground/80 font-medium">
                                        {win.claim_data.type.replace(/_/g, " ")}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <span className="text-[10px] text-muted-foreground font-mono bg-muted/40 px-1.5 py-0.5 rounded border border-border/10">
                                  {new Date(win.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="p-12 flex flex-col items-center justify-center text-center space-y-3 h-full">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                          <Crown className="w-6 h-6 opacity-30" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-extrabold text-foreground uppercase tracking-wider">No Claims Verified Yet</p>
                          <p className="text-[10px] text-muted-foreground max-w-[240px]">
                            Waiting for players to submit claims or for host to verify them.
                          </p>
                        </div>
                      </div>
                    )}
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
