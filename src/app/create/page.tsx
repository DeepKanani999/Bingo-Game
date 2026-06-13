"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { ArrowLeft, Plus, X, Sparkles, Grid3X3, LayoutGrid, Table2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useGameStore } from "@/stores/gameStore"
import { generateGameCode } from "@/lib/realtime"
import { getDefaultBollywoodMappings } from "@/lib/bollywood-data"

const createGameSchema = z.object({
  gameName: z.string().min(1, "Game name required").max(50),
  hostName: z.string().min(1, "Host name required").max(30),
  gameType: z.enum(["number", "bollywood"]),
  ticketSize: z.enum(["5x5", "3x9", "9x10"]),
  numberRange: z.number().min(25).max(90).optional(),
  maxPlayers: z.number().min(2).max(50),
  autoCall: z.boolean(),
  callInterval: z.number().min(3).max(60),
})

type CreateGameFormData = z.infer<typeof createGameSchema>

export default function CreateGamePage() {
  const router = useRouter()
  const setGame = useGameStore((state) => state.setGame)
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const totalSteps = 4

  const form = useForm<CreateGameFormData>({
    resolver: zodResolver(createGameSchema),
    defaultValues: {
      gameName: "",
      hostName: "",
      gameType: "number",
      ticketSize: "5x5",
      numberRange: 90,
      maxPlayers: 10,
      autoCall: false,
      callInterval: 10,
    },
    mode: "onChange",
  })

  const gameType = form.watch("gameType")
  const ticketSize = form.watch("ticketSize")
  const autoCall = form.watch("autoCall")
  const callInterval = form.watch("callInterval")

  const onSubmit = async (data: CreateGameFormData) => {
    setIsSubmitting(true)
    try {
      const hostSecret = crypto.randomUUID()
      const gameId = crypto.randomUUID()
      const gameCode = generateGameCode()

      const { error: gameError } = await supabase.from("games").insert({
        id: gameId,
        game_code: gameCode,
        host_secret: hostSecret,
        game_name: data.gameName,
        host_name: data.hostName,
        game_type: data.gameType,
        ticket_size: data.ticketSize,
        number_range: data.gameType === "number" ? data.numberRange : null,
        max_players: data.maxPlayers,
        auto_call: data.autoCall,
        call_interval: data.callInterval,
        status: "lobby",
      })

      if (gameError) throw gameError

      // If bollywood, seed mappings (with localStorage fallback for edits)
      if (data.gameType === "bollywood") {
        let itemsBase = getDefaultBollywoodMappings()
        
        if (typeof window !== "undefined") {
          const savedCustom = localStorage.getItem("custom_bollywood_mappings")
          if (savedCustom) {
            try {
              const customList = JSON.parse(savedCustom)
              // Merge/override default mappings with custom edited ones
              itemsBase = itemsBase.map(item => {
                const override = customList.find((c: any) => c.number === item.number)
                return override ? { ...item, ...override } : item
              })
              
              // Also add any entirely new numbers added
              const existingNumbers = new Set(itemsBase.map(i => i.number))
              const newItems = customList.filter((c: any) => !existingNumbers.has(c.number))
              itemsBase = [...itemsBase, ...newItems].sort((a, b) => a.number - b.number)
            } catch (e) {
              console.error("Error parsing custom bollywood mappings:", e)
            }
          }
        }

        const mappings = itemsBase.map((m) => ({
          game_id: gameId,
          number: m.number,
          movie_name: m.movie_name,
          dialogue: m.dialogue,
          image_url: m.image_url,
        }))
        await supabase.from("bollywood_mappings").insert(mappings)
      }

      // Store host secret
      localStorage.setItem(`hostSecret_${gameId}`, hostSecret)
      localStorage.setItem("lastHostedGameId", gameId)

      setGame({
        gameId,
        gameCode,
        hostSecret,
        gameName: data.gameName,
        hostName: data.hostName,
        gameType: data.gameType,
        ticketSize: data.ticketSize,
        numberRange: data.numberRange || null,
        maxPlayers: data.maxPlayers,
        autoCall: data.autoCall,
        callInterval: data.callInterval,
        status: "lobby",
      })

      toast.success("Game created!")
      router.push(`/host/${gameId}`)
    } catch (error) {
      console.error("Error creating game:", error)
      toast.error("Failed to create game")
    } finally {
      setIsSubmitting(false)
    }
  }

  const stepProgress = (step / totalSteps) * 100

  const gridIcons: Record<string, any> = {
    "5x5": <Grid3X3 className="w-6 h-6" />,
    "3x9": <LayoutGrid className="w-6 h-6" />,
    "9x10": <Table2 className="w-6 h-6" />,
  }

  const gridDescriptions: Record<string, string> = {
    "5x5": "Classic 5×5 grid with FREE center. 24 items, perfect for quick games.",
    "3x9": "Indian Housie style. 3 rows, 9 columns, 15 numbers per ticket.",
    "9x10": "Full 90-number board. Every number on the ticket. Long games.",
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : router.push("/"))}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {step > 1 ? "Previous Step" : "Home"}
          </button>

          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-extrabold tracking-tight">Create Game</h1>
          </div>
          <p className="text-muted-foreground">
            Step {step} of {totalSteps} —{" "}
            {["Game Info", "Game Type & Grid", "Settings", "Review"][step - 1]}
          </p>
        </div>

        <Progress value={stepProgress} className="mb-8 h-2" />

        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* ============ STEP 1: Game Info ============ */}
          {step === 1 && (
            <Card className="border-2 border-primary/10">
              <CardHeader>
                <CardTitle>Game Details</CardTitle>
                <CardDescription>Give your game a name and identity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="gameName">Game Name</Label>
                  <Input
                    id="gameName"
                    placeholder="e.g. Friday Night Bingo"
                    {...form.register("gameName")}
                    className="h-12 rounded-xl text-base"
                    autoComplete="off"
                  />
                  {form.formState.errors.gameName && (
                    <p className="text-xs text-destructive">{form.formState.errors.gameName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hostName">Your Name (Host)</Label>
                  <Input
                    id="hostName"
                    placeholder="e.g. Rahul"
                    {...form.register("hostName")}
                    className="h-12 rounded-xl text-base"
                    autoComplete="off"
                  />
                  {form.formState.errors.hostName && (
                    <p className="text-xs text-destructive">{form.formState.errors.hostName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Max Players</Label>
                  <Controller
                    name="maxPlayers"
                    control={form.control}
                    render={({ field }) => (
                      <div className="space-y-3">
                        <Slider
                          min={2}
                          max={50}
                          step={1}
                          value={[field.value]}
                          onValueChange={([val]) => field.onChange(val)}
                          className="py-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>2</span>
                          <Badge variant="outline" className="text-sm font-bold">
                            {field.value} players
                          </Badge>
                          <span>50</span>
                        </div>
                      </div>
                    )}
                  />
                </div>

                <Button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!form.watch("gameName") || !form.watch("hostName")}
                  className="w-full h-12 rounded-xl font-bold"
                >
                  Next
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ============ STEP 2: Game Type & Grid ============ */}
          {step === 2 && (
            <Card className="border-2 border-primary/10">
              <CardHeader>
                <CardTitle>Game Type & Grid</CardTitle>
                <CardDescription>Choose what kind of bingo to play</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Game Type */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Game Type</Label>
                  <Controller
                    name="gameType"
                    control={form.control}
                    render={({ field }) => (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { value: "number", icon: "🎲", title: "Number", desc: "Classic 1–90 numbers" },
                          { value: "bollywood", icon: "🎬", title: "Bollywood", desc: "Movies & dialogues" },
                        ].map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => field.onChange(type.value)}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${field.value === type.value
                                ? "border-primary bg-primary/5 shadow-md"
                                : "border-border hover:border-primary/30"
                              }`}
                          >
                            <div className="text-2xl mb-2">{type.icon}</div>
                            <h3 className="font-bold text-sm">{type.title}</h3>
                            <p className="text-xs text-muted-foreground">{type.desc}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  />
                </div>

                {/* Ticket Grid Size */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Ticket Grid Size</Label>
                  <Controller
                    name="ticketSize"
                    control={form.control}
                    render={({ field }) => (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          {(["5x5", "3x9", "9x10"] as const).map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => field.onChange(size)}
                              className={`p-4 rounded-xl border-2 transition-all text-center ${field.value === size
                                  ? "border-primary bg-primary/5 shadow-md"
                                  : "border-border hover:border-primary/30"
                                }`}
                            >
                              <div className="flex justify-center mb-2 text-primary">
                                {gridIcons[size]}
                              </div>
                              <h3 className="font-bold text-lg">{size}</h3>
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                          {gridDescriptions[field.value]}
                        </p>
                      </div>
                    )}
                  />
                </div>

                {/* Number Range (only for number type) */}
                {gameType === "number" && (
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Number Range</Label>
                    <Controller
                      name="numberRange"
                      control={form.control}
                      render={({ field }) => (
                        <ToggleGroup
                          type="single"
                          value={field.value?.toString()}
                          onValueChange={(v) => v && field.onChange(parseInt(v))}
                          className="flex w-full"
                        >
                          {[25, 50, 75, 90].map((n) => (
                            <ToggleGroupItem
                              key={n}
                              value={n.toString()}
                              className="flex-1 h-12 font-bold"
                            >
                              1–{n}
                            </ToggleGroupItem>
                          ))}
                        </ToggleGroup>
                      )}
                    />
                  </div>
                )}

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 h-12 rounded-xl">
                    Back
                  </Button>
                  <Button type="button" onClick={() => setStep(3)} className="flex-1 h-12 rounded-xl font-bold">
                    Next
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ============ STEP 3: Auto-Call Settings ============ */}
          {step === 3 && (
            <Card className="border-2 border-primary/10">
              <CardHeader>
                <CardTitle>Calling Settings</CardTitle>
                <CardDescription>Configure how items are called during the game</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border">
                  <div>
                    <Label className="text-base font-semibold">Auto-Call</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Automatically call items at a set interval
                    </p>
                  </div>
                  <Controller
                    name="autoCall"
                    control={form.control}
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>

                {autoCall && (
                  <div className="space-y-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <Label className="text-sm font-semibold">Call Interval</Label>
                    <Controller
                      name="callInterval"
                      control={form.control}
                      render={({ field }) => (
                        <div className="space-y-3">
                          <Slider
                            min={3}
                            max={60}
                            step={1}
                            value={[field.value]}
                            onValueChange={([val]) => field.onChange(val)}
                          />
                          <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>3s (fast)</span>
                            <Badge variant="secondary" className="text-sm font-bold px-3">
                              Every {field.value} seconds
                            </Badge>
                            <span>60s (slow)</span>
                          </div>
                        </div>
                      )}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      ⏸️ Auto-call pauses when you disconnect and resumes when you reconnect.
                    </p>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-muted/30 border space-y-2">
                  <p className="text-sm font-medium">💡 Tip</p>
                  <p className="text-xs text-muted-foreground">
                    Even with auto-call enabled, you can still manually call items or override the sequence from the host dashboard.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1 h-12 rounded-xl">
                    Back
                  </Button>
                  <Button type="button" onClick={() => setStep(4)} className="flex-1 h-12 rounded-xl font-bold">
                    Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ============ STEP 4: Review ============ */}
          {step === 4 && (
            <Card className="border-2 border-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Review & Create
                </CardTitle>
                <CardDescription>Everything looks good?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4 bg-muted/30 p-5 rounded-xl border">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Game Name</p>
                      <p className="font-bold">{form.watch("gameName")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Host</p>
                      <p className="font-bold">{form.watch("hostName")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Type</p>
                      <Badge className="capitalize">{form.watch("gameType")}</Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Grid</p>
                      <Badge variant="outline">{form.watch("ticketSize")}</Badge>
                    </div>
                    {gameType === "number" && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Range</p>
                        <p className="font-bold">1–{form.watch("numberRange")}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Max Players</p>
                      <p className="font-bold">{form.watch("maxPlayers")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Auto-Call</p>
                      <p className="font-bold">
                        {autoCall ? `Every ${callInterval}s` : "Manual"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(3)} className="flex-1 h-12 rounded-xl">
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 h-14 rounded-xl font-bold text-lg shadow-lg shadow-primary/20"
                  >
                    {isSubmitting ? "Creating..." : "🎲 Create Game"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </div>
    </div>
  )
}
