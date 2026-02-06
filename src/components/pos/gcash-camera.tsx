"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, X, RotateCcw, Check, Upload, ImageIcon, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface GCashCameraProps {
  /** Callback when photo is captured */
  onCapture: (photoData: string) => void
  /** Callback when capture is cancelled */
  onCancel?: () => void
  /** Whether camera is active */
  isActive?: boolean
  /** Additional className */
  className?: string
}

type CameraMode = "idle" | "streaming" | "preview"

/**
 * GCash Camera Component
 * Captures photos of GCash payment confirmations for verification
 * Falls back to file upload if camera is not available
 */
export function GCashCamera({
  onCapture,
  onCancel,
  isActive = true,
  className,
}: GCashCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [mode, setMode] = useState<CameraMode>("idle")
  const [photoData, setPhotoData] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasCamera, setHasCamera] = useState<boolean | null>(null)

  // Stop camera stream
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setMode("idle")
  }, [])

  // Check if camera is available
  useEffect(() => {
    async function checkCamera() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter((d) => d.kind === "videoinput")
        setHasCamera(videoDevices.length > 0)
      } catch {
        setHasCamera(false)
      }
    }
    checkCamera()
  }, [])

  // Cleanup stream on unmount or when inactive
  useEffect(() => {
    if (!isActive) {
      // Schedule stopStream to avoid synchronous setState in effect
      queueMicrotask(() => {
        stopStream()
      })
    }
    return () => {
      // Cleanup on unmount - synchronous is fine in cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [isActive, stopStream])

  const startCamera = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Prefer back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setMode("streaming")
    } catch (err) {
      console.error("Camera error:", err)
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          setError("Camera permission denied. Please allow camera access or use file upload.")
        } else if (err.name === "NotFoundError") {
          setError("No camera found. Please use file upload instead.")
        } else {
          setError("Could not access camera. Please use file upload instead.")
        }
      }
      setHasCamera(false)
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0)

    // Get image data as base64
    const imageData = canvas.toDataURL("image/jpeg", 0.8)
    setPhotoData(imageData)
    stopStream()
    setMode("preview")
  }

  const retake = () => {
    setPhotoData(null)
    startCamera()
  }

  const confirmPhoto = () => {
    if (photoData) {
      onCapture(photoData)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setPhotoData(result)
      setMode("preview")
      setError(null)
    }
    reader.onerror = () => {
      setError("Failed to read file")
    }
    reader.readAsDataURL(file)
  }

  const handleCancel = () => {
    stopStream()
    setPhotoData(null)
    setMode("idle")
    onCancel?.()
  }

  if (!isActive) return null

  return (
    <div className={cn("space-y-3", className)}>
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Error message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Camera/Preview area */}
      <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
        {mode === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center px-4">
              Capture a photo of the GCash payment confirmation
            </p>
          </div>
        )}

        {mode === "streaming" && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {mode === "preview" && photoData && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoData}
            alt="Captured GCash confirmation"
            className="absolute inset-0 w-full h-full object-contain bg-black"
          />
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {mode === "idle" && (
          <>
            {hasCamera !== false && (
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-11 min-h-11"
                onClick={startCamera}
              >
                <Camera className="h-5 w-5 mr-2" />
                Open Camera
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11 min-h-11"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-5 w-5 mr-2" />
              Upload Photo
            </Button>
          </>
        )}

        {mode === "streaming" && (
          <>
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11 min-h-11"
              onClick={handleCancel}
            >
              <X className="h-5 w-5 mr-2" />
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1 h-11 min-h-11"
              onClick={capturePhoto}
            >
              <Camera className="h-5 w-5 mr-2" />
              Capture
            </Button>
          </>
        )}

        {mode === "preview" && (
          <>
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11 min-h-11"
              onClick={retake}
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Retake
            </Button>
            <Button
              type="button"
              className="flex-1 h-11 min-h-11"
              onClick={confirmPhoto}
            >
              <Check className="h-5 w-5 mr-2" />
              Use Photo
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
