"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { 
  ArrowLeft, 
  Save, 
  Trash2, 
  Plus, 
  Sparkles, 
  Loader2, 
  Copy, 
  LayoutTemplate,
  CheckCircle2,
  Share2
} from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function TemplateSystemPage() {
  const params = useParams()
  const gameId = params.gameId as string
  const secretKey = params.secretKey as string
  const router = useRouter()

  const [templates, setTemplates] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [templateName, setTemplateName] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // ============ Auth & Load ============
  useEffect(() => {
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
      
      const { data: tData } = await supabase
        .from("game_templates")
        .select("*")
        .order("created_at", { ascending: false })
      
      setTemplates(tData || [])
      setIsLoading(false)
    }
    verify()
  }, [gameId, secretKey, router])

  // ============ Actions ============
  const handleSaveCurrentAsTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Enter a template name")
      return
    }

    setIsSaving(true)
    try {
      // 1. Fetch current mappings
      const { data: mappings } = await supabase
        .from("bollywood_mappings")
        .select("*")
        .eq("game_id", gameId)
      
      if (!mappings || mappings.length === 0) {
        toast.error("No mappings to save! Create some first.")
        setIsSaving(false)
        return
      }

      // 2. Save as template
      const templateData = mappings.map(m => ({
        number: m.number,
        movie_name: m.movie_name,
        dialogue: m.dialogue,
        image_url: m.image_url
      }))

      const { data, error } = await supabase.from("game_templates").insert({
        name: templateName.trim(),
        description: `Saved from ${gameId}`,
        template_data: templateData,
        game_type: "bollywood"
      }).select().single()

      if (error) throw error
      setTemplates(prev => [data, ...prev])
      setTemplateName("")
      toast.success("Template saved!")
    } catch {
      toast.error("Failed to save template")
    } finally {
      setIsSaving(false)
    }
  }

  const handleLoadTemplate = async (template: any) => {
    if (!window.confirm(`Load "${template.name}"? This will overwrite current mappings.`)) return
    
    setIsSaving(true)
    try {
      // Clear current mappings
      await supabase.from("bollywood_mappings").delete().eq("game_id", gameId)
      
      // Insert from template
      const toInsert = template.template_data.map((m: any) => ({
        game_id: gameId,
        ...m
      }))
      
      const { error } = await supabase.from("bollywood_mappings").insert(toInsert)
      if (error) throw error

      toast.success(`Loaded "${template.name}" template into game!`)
      router.push(`/host/${gameId}/${secretKey}/mappings`)
    } catch {
      toast.error("Failed to load template")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm("Permanently delete this template?")) return
    try {
      await supabase.from("game_templates").delete().eq("id", id)
      setTemplates(prev => prev.filter(t => t.id !== id))
      toast.success("Template deleted")
    } catch {
      toast.error("Failed to delete")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Syncing templates...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <button 
              onClick={() => router.push(`/host/${gameId}/${secretKey}`)} 
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black">Templates</h1>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Library & Presets</p>
            </div>
          </div>
          <LayoutTemplate className="w-8 h-8 text-primary/40" />
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          
          {/* Left: Save Current */}
          <div className="lg:col-span-5">
            <Card className="border-2 border-primary/20 sticky top-24 shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg">Save Current Session</CardTitle>
                <CardDescription>
                  Save your current set of mappings as a reusable theme.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Template Title</label>
                  <Input 
                    placeholder="e.g. 90s Bollywood Hits" 
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
                <Button 
                  className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20"
                  onClick={handleSaveCurrentAsTemplate}
                  disabled={isSaving || !templateName.trim()}
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Mappings as Template
                </Button>
                <p className="text-[10px] text-center text-muted-foreground">
                  Quickly load this theme in future games to skip setup!
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right: Template List */}
          <div className="lg:col-span-7 space-y-4">
            <p className="text-sm font-bold text-muted-foreground px-2">Your Saved Themes ({templates.length})</p>
            
            {templates.length === 0 && (
              <div className="py-20 text-center border-2 border-dashed rounded-3xl opacity-40">
                <Sparkles className="w-12 h-12 mx-auto mb-4" />
                <p className="text-sm">No templates saved yet.</p>
              </div>
            )}

            <div className="grid gap-4">
              {templates.map((t) => (
                <Card key={t.id} className="group hover:border-primary/40 transition-all overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between p-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-lg">{t.name}</h3>
                          <Badge variant="secondary" className="text-[10px] capitalize">{t.game_type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{t.template_data?.length || 0} Items • Created {new Date(t.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteTemplate(t.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          onClick={() => handleLoadTemplate(t)}
                          className="h-10 rounded-xl font-bold bg-primary/10 text-primary hover:bg-primary/20"
                          variant="ghost"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Load
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
