"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Save, 
  Upload, 
  Search, 
  Sparkles, 
  Loader2,
  FileJson,
  Edit2
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getDefaultBollywoodMappings } from "@/lib/bollywood-data"

export default function MappingEditorPage() {
  const params = useParams()
  const gameId = params.gameId as string
  const secretKey = params.secretKey as string
  const router = useRouter()

  const [mappings, setMappings] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [isBulkOpen, setIsBulkOpen] = useState(false)
  const [bulkData, setBulkData] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  
  // New Mapping State
  const [newMapping, setNewMapping] = useState({
    number: "",
    movie_name: "",
    dialogue: "",
    image_url: ""
  })

  // ============ Auth Check & Load ============
  useEffect(() => {
    const verify = async () => {
      const { data, error } = await supabase
        .from("games")
        .select("host_secret, game_type")
        .eq("id", gameId)
        .single()

      if (error || !data || data.host_secret !== secretKey) {
        toast.error("Invalid host access")
        router.push("/")
        return
      }
      
      const { data: mData } = await supabase
        .from("bollywood_mappings")
        .select("*")
        .eq("game_id", gameId)
        .order("number", { ascending: true })
      
      setMappings(mData || [])
      setIsLoading(false)
    }
    verify()
  }, [gameId, secretKey, router])

  // ============ Actions ============
  const handleAdd = async () => {
    if (!newMapping.number || !newMapping.movie_name) {
      toast.error("Number and Name are required")
      return
    }

    const num = parseInt(newMapping.number)
    if (mappings.some(m => m.number === num)) {
      toast.error("Number already exists!")
      return
    }

    try {
      const { data, error } = await supabase
        .from("bollywood_mappings")
        .insert({
          game_id: gameId,
          number: num,
          movie_name: newMapping.movie_name,
          dialogue: newMapping.dialogue,
          image_url: newMapping.image_url
        })
        .select()
        .single()
      
      if (error) throw error

      // Save to localStorage
      if (typeof window !== "undefined") {
        const savedCustom = localStorage.getItem("custom_bollywood_mappings")
        let customList = savedCustom ? JSON.parse(savedCustom) : []
        customList = customList.filter((c: any) => c.number !== num)
        customList.push({
          number: num,
          movie_name: newMapping.movie_name,
          dialogue: newMapping.dialogue,
          image_url: newMapping.image_url
        })
        localStorage.setItem("custom_bollywood_mappings", JSON.stringify(customList))
      }

      setMappings(prev => [...prev, data].sort((a, b) => a.number - b.number))
      setIsAdding(false)
      setNewMapping({ number: "", movie_name: "", dialogue: "", image_url: "" })
      toast.success("Mapping added!")
    } catch {
      toast.error("Failed to add mapping")
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const deletedItem = mappings.find(m => m.id === id)
      await supabase.from("bollywood_mappings").delete().eq("id", id)

      // Remove from localStorage
      if (deletedItem && typeof window !== "undefined") {
        const savedCustom = localStorage.getItem("custom_bollywood_mappings")
        if (savedCustom) {
          let customList = JSON.parse(savedCustom)
          customList = customList.filter((c: any) => c.number !== deletedItem.number)
          localStorage.setItem("custom_bollywood_mappings", JSON.stringify(customList))
        }
      }

      setMappings(prev => prev.filter(m => m.id !== id))
      toast.success("Mapping deleted")
    } catch {
      toast.error("Failed to delete")
    }
  }

  const handleBulkImport = async () => {
    try {
      const data = JSON.parse(bulkData)
      if (!Array.isArray(data)) throw new Error("Must be an array")
      
      setIsSaving(true)
      const toInsert = data.map(item => ({
        game_id: gameId,
        number: item.number,
        movie_name: item.movie_name || item.name,
        dialogue: item.dialogue || "",
        image_url: item.image_url || null
      }))

      // Clear existing and insert new
      await supabase.from("bollywood_mappings").delete().eq("game_id", gameId)
      const { data: inserted, error } = await supabase.from("bollywood_mappings").insert(toInsert).select()
      
      if (error) throw error

      // Save to localStorage
      if (typeof window !== "undefined") {
        const customList = toInsert.map(item => ({
          number: item.number,
          movie_name: item.movie_name,
          dialogue: item.dialogue,
          image_url: item.image_url
        }))
        localStorage.setItem("custom_bollywood_mappings", JSON.stringify(customList))
      }

      setMappings(inserted || [])
      setIsBulkOpen(false)
      toast.success("Imported successfully!")
    } catch (e: any) {
      toast.error(`Invalid JSON: ${e.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const loadDefaults = async () => {
    if (!window.confirm("Overwrite current mappings with defaults?")) return
    setIsSaving(true)
    try {
      const defaults = getDefaultBollywoodMappings().map(m => ({
        game_id: gameId,
        number: m.number,
        movie_name: m.movie_name,
        dialogue: m.dialogue,
        image_url: m.image_url
      }))
      
      await supabase.from("bollywood_mappings").delete().eq("game_id", gameId)
      const { data } = await supabase.from("bollywood_mappings").insert(defaults).select()

      // Reset localStorage custom mappings
      if (typeof window !== "undefined") {
        localStorage.removeItem("custom_bollywood_mappings")
      }

      setMappings(data || [])
      toast.success("Defaults loaded!")
    } catch {
      toast.error("Failed to load defaults")
    } finally {
      setIsSaving(false)
    }
  }

  const filteredMappings = mappings.filter(m => 
    m.movie_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.number.toString().includes(searchQuery)
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Syncing mappings...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push(`/host/${gameId}/${secretKey}`)} 
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-extrabold text-lg">Bollywood Mappings</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Customize Item Library</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadDefaults}>
              <Sparkles className="w-4 h-4 mr-2" />Defaults
            </Button>
            <Button size="sm" onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4 mr-2" />Add New
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Controls Card */}
        <Card className="border-2 border-primary/10">
          <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search movies or numbers..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 rounded-xl"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setIsBulkOpen(true)} className="h-11 rounded-xl">
                <Upload className="w-4 h-4 mr-2" />Bulk Import
              </Button>
              <Badge variant="outline" className="h-11 px-4 text-sm font-bold rounded-xl whitespace-nowrap">
                {mappings.length} Items
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Table Card */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] text-center">#</TableHead>
                  <TableHead>Movie / Item Name</TableHead>
                  <TableHead className="hidden md:table-cell">Dialogue / Hint</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMappings.map((m) => (
                  <TableRow key={m.id} className="group">
                    <TableCell className="font-black text-primary text-center bg-primary/5">
                      {m.number}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{m.movie_name}</span>
                        {m.image_url && (
                          <span className="text-[10px] text-primary underline truncate max-w-[200px]">{m.image_url}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground italic">
                      {m.dialogue || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDelete(m.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredMappings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-20 text-center text-muted-foreground">
                      <div className="flex flex-col items-center">
                        <Search className="w-12 h-12 mb-4 opacity-20" />
                        <p>No mappings found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add Dialog */}
      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Add Mapping</DialogTitle>
            <DialogDescription>Map a number to a bollywood item</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider">Number</label>
              <Input 
                type="number"
                placeholder="1"
                value={newMapping.number}
                onChange={(e) => setNewMapping(prev => ({ ...prev, number: e.target.value }))}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider">Movie Name</label>
              <Input 
                placeholder="e.g. Sholay"
                value={newMapping.movie_name}
                onChange={(e) => setNewMapping(prev => ({ ...prev, movie_name: e.target.value }))}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider">Dialogue / Hint</label>
              <Input 
                placeholder="Yeh Dosti..."
                value={newMapping.dialogue}
                onChange={(e) => setNewMapping(prev => ({ ...prev, dialogue: e.target.value }))}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider">Image URL (Optional)</label>
              <Input 
                placeholder="https://..."
                value={newMapping.image_url}
                onChange={(e) => setNewMapping(prev => ({ ...prev, image_url: e.target.value }))}
                className="h-11 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdding(false)} className="rounded-xl flex-1">Cancel</Button>
            <Button onClick={handleAdd} className="rounded-xl flex-1 font-bold">Add Mapping</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="w-5 h-5" />
              Bulk Import (JSON)
            </DialogTitle>
            <DialogDescription>
              Paste an array of mapping objects. Format: <code>[{"{"}"number":1, "movie_name":"..."{"}"}]</code>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <textarea
              className="w-full h-64 p-4 font-mono text-xs rounded-xl border bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
              value={bulkData}
              onChange={(e) => setBulkData(e.target.value)}
              placeholder="[ { 'number': 1, 'movie_name': 'Sholay', 'dialogue': '...' }, ... ]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkOpen(false)} className="rounded-xl flex-1">Cancel</Button>
            <Button 
              onClick={handleBulkImport} 
              disabled={isSaving || !bulkData.trim()} 
              className="rounded-xl flex-1 font-bold"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Import & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
