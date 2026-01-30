"use client"

import { useState, useEffect } from "react"

type Orientation = "portrait" | "landscape"

interface OrientationInfo {
  orientation: Orientation
  width: number
  height: number
  isPortrait: boolean
  isLandscape: boolean
}

/**
 * Hook for detecting screen orientation changes
 * Uses window dimensions as primary detection method for broad compatibility
 */
export function useOrientation(): OrientationInfo {
  const [info, setInfo] = useState<OrientationInfo>(() => {
    // SSR-safe initial state
    if (typeof window === "undefined") {
      return {
        orientation: "portrait",
        width: 0,
        height: 0,
        isPortrait: true,
        isLandscape: false,
      }
    }

    const width = window.innerWidth
    const height = window.innerHeight
    const isPortrait = height >= width
    return {
      orientation: isPortrait ? "portrait" : "landscape",
      width,
      height,
      isPortrait,
      isLandscape: !isPortrait,
    }
  })

  useEffect(() => {
    const updateOrientation = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const isPortrait = height >= width

      setInfo({
        orientation: isPortrait ? "portrait" : "landscape",
        width,
        height,
        isPortrait,
        isLandscape: !isPortrait,
      })
    }

    // Update on resize
    window.addEventListener("resize", updateOrientation)

    // Also listen to orientationchange for mobile devices
    window.addEventListener("orientationchange", updateOrientation)

    // Initial update
    updateOrientation()

    return () => {
      window.removeEventListener("resize", updateOrientation)
      window.removeEventListener("orientationchange", updateOrientation)
    }
  }, [])

  return info
}
