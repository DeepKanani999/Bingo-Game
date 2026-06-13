"use client"

import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Dice5, Film, Sparkles, ArrowRight, Gamepad2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function LandingPage() {
  const router = useRouter()
  const [isJoinOpen, setIsJoinOpen] = useState(false)
  const [gameCode, setGameCode] = useState("")
  const [playerName, setPlayerName] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Check for active session
    const activeGame = localStorage.getItem("activeGameId")
    const activePlayer = localStorage.getItem("activePlayerId")
    if (activeGame && activePlayer) {
      // Could auto-redirect to active game
    }
  }, [])

  const handleJoinGame = async () => {
    if (!gameCode.trim() || !playerName.trim()) {
      toast.error("Please enter both game code and your name")
      return
    }

    setIsJoining(true)
    try {
      const response = await fetch("/api/game/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameCode: gameCode.trim().toUpperCase(), display_name: playerName.trim() })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        toast.error(result.error || "Failed to join game")
        return
      }

      // Store session
      localStorage.setItem("activeGameId", result.gameId)
      localStorage.setItem("activePlayerId", result.playerId)
      localStorage.setItem("activePlayerName", result.playerName)

      toast.success("Joined game!")
      
      if (result.status === "active") {
        router.push(`/play/${result.gameId}/${result.playerId}`)
      } else {
        router.push(`/lobby/${result.gameId}?player=${result.playerId}`)
      }
    } catch (error) {
      console.error("Join error:", error)
      toast.error("Failed to join game")
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/5 to-transparent rounded-full" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-24">
          {/* Logo animation */}
          <div className="relative mb-8 flex flex-col items-center">
            {/* Main Brand Logo */}
            <div className="mb-6 animate-in fade-in zoom-in duration-1000">
              <img 
                src="/Greypix-new-logo.png" 
                alt="Greypix Logo" 
                className="h-25 sm:h-30 object-contain"
              />
            </div>
            
            <div className="flex items-center gap-3 mb-2">
              {mounted && (
                <>
                  <div className="relative">
                    <Dice5 className="w-14 h-14 sm:w-16 sm:h-16 text-primary animate-bounce" />
                    <Sparkles className="w-5 h-5 text-yellow-500 absolute -top-1 -right-1 animate-ping" />
                  </div>
                  <Film className="w-14 h-14 sm:w-16 sm:h-16 text-primary animate-bounce" style={{ animationDelay: "0.15s" }} />
                  <Gamepad2 className="w-14 h-14 sm:w-16 sm:h-16 text-primary animate-bounce" style={{ animationDelay: "0.3s" }} />
                </>
              )}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-5xl sm:text-7xl font-black tracking-tighter text-center mb-4 bg-gradient-to-r from-foreground via-foreground to-foreground/60 bg-clip-text">
            BINGO
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground text-center max-w-md mb-2 font-medium">
            Real-time multiplayer bingo with friends
          </p>
          <p className="text-sm text-muted-foreground/60 text-center max-w-sm mb-10">
            Numbers • Bollywood • Custom — Choose your style, invite your squad, play instantly
          </p>

          {/* CTA Buttons */}
          <div className="flex w-full max-w-4xl flex-col items-center justify-center gap-4 mx-auto sm:flex-row">
            <Button
              size="lg"
              onClick={() => router.push("/create")}
              className="h-14 w-full text-base font-bold rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-primary/40 active:scale-[0.98] sm:w-[24rem]"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Host a Game
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={() => setIsJoinOpen(true)}
              className="h-14 w-full text-base font-bold rounded-xl border-2 transition-all hover:scale-[1.02] hover:bg-primary/5 active:scale-[0.98] sm:w-[24rem]"
            >
              <ArrowRight className="w-5 h-5 mr-2" />
              Join Game
            </Button>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-10">
            {["Real-time", "No Login", "PWA", "Multi-Grid", "Auto-Call", "Voice"].map((feature) => (
              <span
                key={feature}
                className="px-3 py-1 text-xs font-medium rounded-full bg-primary/5 text-primary/80 border border-primary/10"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="px-4 py-5 -mt-20 max-w-3xl mx-auto w-full">
          <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Create",
                desc: "Host creates a game — pick Numbers, Bollywood, or Custom mode",
                icon: "🎯",
              },
              {
                step: "02",
                title: "Share",
                desc: "Share the game code or link with friends via WhatsApp",
                icon: "📱",
              },
              {
                step: "03",
                title: "Play!",
                desc: "Mark your board, claim bingo, win! All in real-time",
                icon: "🎉",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative p-6 rounded-2xl bg-card border hover:border-primary/30 hover:shadow-lg transition-all group flex flex-col items-center text-center"
              >
                <span className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  {item.step}
                </span>
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{item.icon}</div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 px-4 py-6 text-center text-sm text-muted-foreground/60">
          <p>Built with ❤️ for friends who love games</p>
        </div>
      </div>

      {/* Join Game Dialog */}
      <Dialog open={isJoinOpen} onOpenChange={setIsJoinOpen}>
        <DialogContent className="w-full max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Join a Game</DialogTitle>
            <DialogDescription>
              Enter the game code and your name to join
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Game Code</label>
              <Input
                placeholder="e.g. ABC123"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                className="text-center text-lg font-mono tracking-[0.3em] h-12 rounded-xl"
                maxLength={6}
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Your Name</label>
              <Input
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && gameCode.trim() && playerName.trim() && handleJoinGame()
                }
                className="h-12 rounded-xl"
                maxLength={20}
                autoComplete="off"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-xl"
                onClick={() => setIsJoinOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-12 rounded-xl font-bold"
                onClick={handleJoinGame}
                disabled={!gameCode.trim() || !playerName.trim() || isJoining}
              >
                {isJoining ? "Joining..." : "Join"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
