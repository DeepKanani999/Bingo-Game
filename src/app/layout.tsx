import type { Metadata } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"
import "./globals.css"

export const metadata: Metadata = {
  title: "Bingo - Play with Friends",
  description:
    "Real-time multiplayer bingo game with Number and Bollywood modes. Play with friends instantly!",
  manifest: "/manifest.json",
  openGraph: {
    title: "Bingo - Play with Friends",
    description: "Real-time multiplayer bingo game",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bingo - Play with Friends",
    description: "Real-time multiplayer bingo game",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Bingo",
  },
}

export const viewport = {
  themeColor: "#000000",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider>
          {children}
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
