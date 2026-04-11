"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CircleAlert as AlertCircle } from "lucide-react"

export default function NotFoundPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="w-12 h-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Page Not Found</CardTitle>
          <CardDescription>
            The page you&apos;re looking for doesn&apos;t exist or the game has ended.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This could mean:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              <li>The game link is invalid or expired</li>
              <li>The game has already ended</li>
              <li>You&apos;ve been disconnected from the game</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex-1"
            >
              Go Back
            </Button>
            <Button onClick={() => router.push("/")} className="flex-1">
              Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
