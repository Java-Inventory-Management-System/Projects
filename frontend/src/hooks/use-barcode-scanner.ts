import { useState, useEffect, useRef, useCallback } from "react"
import { t } from "i18next"
import { toast } from "@/utils/toast"

interface BarcodeDetectorAPI {
  detect(el: HTMLVideoElement): Promise<Array<{ rawValue: string }>>
}

export function useBarcodeScanner(onDetect: (value: string) => void) {
  const [scanning, setScanning] = useState(false)
  const [barcodeInput, setBarcodeInput] = useState("")
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const detectorRef = useRef<BarcodeDetectorAPI | null>(null)
  const onDetectRef = useRef(onDetect)
  onDetectRef.current = onDetect

  const stopCamera = useCallback(() => {
    setScanning(false)
    cancelAnimationFrame(rafRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const detectLoop = useCallback(() => {
    if (!videoRef.current || !detectorRef.current || !streamRef.current) return
    detectorRef.current.detect(videoRef.current)
      .then((barcodes) => {
        for (const b of barcodes) onDetectRef.current(b.rawValue)
      })
      .catch(() => {})
    rafRef.current = requestAnimationFrame(detectLoop)
  }, [])

  const toggleCamera = useCallback(async () => {
    if (scanning) { stopCamera(); return }
    try {
      const w = window as unknown as { BarcodeDetector?: new () => BarcodeDetectorAPI }
      if (!detectorRef.current && w.BarcodeDetector) {
        detectorRef.current = new w.BarcodeDetector()
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setScanning(true)
        await videoRef.current.play()
        detectLoop()
      }
    } catch {
      toast.error(t("barcodeScanner.cameraError"))
    }
  }, [scanning, stopCamera, detectLoop])

  useEffect(() => {
    return () => { stopCamera() }
  }, [stopCamera])

  return { scanning, barcodeInput, setBarcodeInput, videoRef, stopCamera, toggleCamera }
}
