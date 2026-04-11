"use client"

import * as React from "react"

type Theme = "dark" | "light" | "system"

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

const ThemeProviderContext = React.createContext<{
  theme: Theme
  setTheme: (theme: Theme) => void
} | null>(null)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "ui-theme",
  ...props
}: ThemeProviderProps) {
  // Use undefined for initial state to avoid hydration mismatch
  const [theme, setThemeState] = React.useState<Theme | undefined>(undefined)

  useEffect(() => {
    const storedTheme = localStorage.getItem(storageKey) as Theme | null
    if (storedTheme) {
      setThemeState(storedTheme)
    } else {
      setThemeState(defaultTheme)
    }
  }, [defaultTheme, storageKey])

  const setTheme = (theme: Theme) => {
    localStorage.setItem(storageKey, theme)
    setThemeState(theme)
  }

  React.useEffect(() => {
    if (!theme) return
    const root = window.document.documentElement
    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
  }, [theme])

  // Prevent flash of unstyled content
  if (theme === undefined) return null

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }} {...props}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext)
  if (!context) throw new Error("useTheme must be used within ThemeProvider")
  return context
}

// Helper hook for window width (PWA optimization)
export function useWindowWidth() {
  const [width, setWidth] = React.useState(typeof window !== "undefined" ? window.innerWidth : 1200)
  React.useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])
  return width
}

// Side effect for React.useEffect
const useEffect = React.useEffect
