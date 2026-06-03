"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Trophy, Home, RotateCcw, Users, Hash, Loader2, Sparkles, Star } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { CLAIM_DISPLAY_INFO } from "@/lib/claim-validator"

export default function ResultsPage() {
  const params = useParams()
  const gameId = params.gameId as string
  const router = useRouter()

  const [gameData, setGameData] = useState<any>(null)
  const [winners, setWinners] = useState<any[]>([])
  const [topPlayers, setTopPlayers] = useState<any[]>([])
  const [calledCount, setCalledCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Game Data
        const { data: game } = await supabase.from("games").select("*").eq("id", gameId).single()
        setGameData(game)

        // 2. Winners (Approved claims)
        const { data: claims } = await supabase
          .from("claims")
          .select("*, players(display_name)")
          .eq("game_id", gameId)
          .eq("status", "approved")
          .order("created_at", { ascending: true })
        
        setWinners(claims || [])

        // 3. Called count
        const { count } = await supabase.from("called_items").select("*", { count: "exact", head: true }).eq("game_id", gameId)
        setCalledCount(count || 0)

        // 4. Top players (by marked marks)
        // Note: For a real app, we'd use a more sophisticated view, but let's count for this game
        const { data: players } = await supabase.from("players").select("id, display_name").eq("game_id", gameId)
        if (players) {
          const stats = await Promise.all(players.map(async (p) => {
            const { count: mCount } = await supabase.from("player_marks").select("*", { count: "exact", head: true }).eq("player_id", p.id)
            return { name: p.display_name, marks: mCount || 0 }
          }))
          setTopPlayers(stats.sort((a, b) => b.marks - a.marks).slice(0, 5))
        }

      } catch (error) {
        toast.error("Failed to load results")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [gameId])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Calculating scores...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8 flex flex-col items-center">
      <div className="max-w-3xl w-full space-y-8">
        
        {/* Header Hero */}
        <div className="text-center space-y-4">
          <div className="inline-block p-4 rounded-full bg-yellow-500/10 mb-2">
            <Trophy className="w-16 h-16 text-yellow-500 animate-bounce" />
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tighter">GAME OVER!</h1>
          <p className="text-muted-foreground text-lg">
            Final results for <span className="text-foreground font-bold">{gameData?.game_name}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Winners Section */}
          <Card className="border-2 border-yellow-500/30 overflow-hidden shadow-xl">
            <CardHeader className="bg-yellow-500/5">
              <CardTitle className="flex items-center gap-2 text-yellow-600">
                <Star className="w-5 h-5 fill-yellow-500" />
                Champions
              </CardTitle>
              <CardDescription>First players to claim bingo</CardDescription>
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

                return (
                  <div className="divide-y divide-slate-100">
                    {types.map((type) => {
                      const info = CLAIM_DISPLAY_INFO[type]
                      const claimWinner = winners.find(win => {
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
                              <p className="font-extrabold text-sm text-slate-800">{info?.label || type}</p>
                              {prize && (
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full mt-1.5 animate-in fade-in">
                                  <span>🎁</span>
                                  <span className="uppercase tracking-wider text-[9px] text-amber-500/80 mr-0.5">Prize:</span>
                                  {prize}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 self-start sm:self-center">
                            {claimWinner ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-250 hover:bg-emerald-100 font-black px-2.5 py-1 text-xs rounded-full flex items-center gap-1">
                                <Trophy className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                <span>{claimWinner.players?.display_name || "Winner"}</span>
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-400 font-bold bg-slate-100 border border-slate-200/60 px-2.5 py-1 rounded-full">
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

          {/* Stats Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 opacity-60">
                  <Hash className="w-4 h-4" /> Game Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/40 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Calls</p>
                    <p className="text-2xl font-black">{calledCount}</p>
                  </div>
                  <div className="p-3 bg-muted/40 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Mode</p>
                    <p className="text-lg font-black capitalize">{gameData?.game_type}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 opacity-60">
                  <Users className="w-4 h-4" /> Top Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y text-sm">
                  {topPlayers.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-muted-foreground font-bold">{p.marks} marks</span>
                    </div>
                  ))}
                  {topPlayers.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground italic text-xs">
                      No player data available.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button 
            size="lg" 
            className="flex-1 h-16 rounded-2xl font-black text-xl shadow-lg hover:scale-[1.02] transition-transform"
            onClick={() => router.push("/")}
          >
            <Home className="w-6 h-6 mr-2" />
            BACK TO HOME
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="flex-1 h-16 rounded-2xl font-black text-xl border-2 hover:bg-primary/5 transition-colors"
            onClick={() => router.push("/create")}
          >
            <RotateCcw className="w-6 h-6 mr-2" />
            CREATE NEW
          </Button>
        </div>

        {/* Confetti / Celebration */}
        <div className="relative h-20 w-full overflow-hidden opacity-50">
          <div className="absolute top-0 left-1/4 animate-bounce bg-blue-500 w-2 h-2 rounded-full" style={{ animationDelay: '0.1s' }} />
          <div className="absolute top-4 left-2/4 animate-bounce bg-pink-500 w-3 h-3 rounded-full" style={{ animationDelay: '0.3s' }} />
          <div className="absolute top-2 left-3/4 animate-bounce bg-green-500 w-2 h-2 rounded-full" style={{ animationDelay: '0.2s' }} />
          <div className="absolute top-6 left-1/3 animate-bounce bg-yellow-500 w-3 h-1 rounded-full" style={{ animationDelay: '0.5s' }} />
        </div>

      </div>
    </div>
  )
}
