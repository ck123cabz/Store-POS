"use client"

import { createContext, useContext, useState } from "react"
import { DEFAULT_COLOR_THEME } from "@/lib/themes"

const STORAGE_KEY = "color-theme"

interface ColorThemeContext {
  colorTheme: string
  setColorTheme: (theme: string) => void
}

const ColorThemeCtx = createContext<ColorThemeContext>({
  colorTheme: DEFAULT_COLOR_THEME,
  setColorTheme: () => {},
})

export function useColorTheme() {
  return useContext(ColorThemeCtx)
}

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializer reads localStorage once on mount (inline script already set the attribute)
  const [colorTheme, setColorThemeState] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_COLOR_THEME
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_COLOR_THEME
  })

  function setColorTheme(theme: string) {
    setColorThemeState(theme)

    if (theme === DEFAULT_COLOR_THEME) {
      document.documentElement.removeAttribute("data-color-theme")
      localStorage.removeItem(STORAGE_KEY)
    } else {
      document.documentElement.setAttribute("data-color-theme", theme)
      localStorage.setItem(STORAGE_KEY, theme)
    }
  }

  return (
    <ColorThemeCtx.Provider value={{ colorTheme, setColorTheme }}>
      {children}
    </ColorThemeCtx.Provider>
  )
}
