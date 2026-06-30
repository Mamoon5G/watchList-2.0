"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const [mounted, setMounted] = React.useState(false)
  const { theme, setTheme } = useTheme()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-all flex items-center justify-center"
      aria-label="Toggle theme"
    >
      {mounted ? (
        <>
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-yellow-500 transition-all" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-500 transition-all" />
          )}
        </>
      ) : (
        <div className="w-4 h-4" />
      )}
    </button>
  )
}
