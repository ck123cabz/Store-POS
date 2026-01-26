"use client"

import { useState, useEffect } from "react"

const ONBOARDING_KEY = "store-pos-onboarding-complete"

export function useOnboarding() {
  const [isComplete, setIsComplete] = useState(true) // Default to true to prevent flash
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(ONBOARDING_KEY)
    setIsComplete(stored === "true")
    setIsLoaded(true)
  }, [])

  const markComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, "true")
    setIsComplete(true)
  }

  const reset = () => {
    localStorage.removeItem(ONBOARDING_KEY)
    setIsComplete(false)
  }

  return {
    isComplete,
    isLoaded,
    markComplete,
    reset,
    shouldShowTour: isLoaded && !isComplete,
  }
}
