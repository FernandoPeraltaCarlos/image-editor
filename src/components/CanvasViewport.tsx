import { useEffect, useMemo, useRef, useState } from 'react'
import { CropOverlay } from './CropOverlay'
import type { ImageRect } from '../lib/types'

interface CanvasViewportProps {
  canvas: HTMLCanvasElement
  showCrop: boolean
  cropRect: ImageRect | null
  cropAspect: number | null
  onCropChange: (rect: ImageRect) => void
}

const VIEWPORT_PADDING = 16
const MAX_HEIGHT = 560

export function CanvasViewport({
  canvas,
  showCrop,
  cropRect,
  cropAspect,
  onCropChange,
}: CanvasViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const displayRef = useRef<HTMLCanvasElement>(null)
  const [availableWidth, setAvailableWidth] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const observer = new ResizeObserver(() => {
      setAvailableWidth(container.clientWidth)
    })

    observer.observe(container)
    setAvailableWidth(container.clientWidth)

    return () => {
      observer.disconnect()
    }
  }, [])

  const scale = useMemo(() => {
    const maxWidth = availableWidth > 0 ? availableWidth - VIEWPORT_PADDING * 2 : 760
    return Math.min(1, maxWidth / canvas.width, MAX_HEIGHT / canvas.height)
  }, [availableWidth, canvas])

  useEffect(() => {
    const displayCanvas = displayRef.current
    if (!displayCanvas) {
      return
    }

    const width = Math.round(canvas.width * scale)
    const height = Math.round(canvas.height * scale)
    displayCanvas.width = width
    displayCanvas.height = height

    const ctx = displayCanvas.getContext('2d')
    if (!ctx) {
      return
    }

    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(canvas, 0, 0, width, height)
  }, [canvas, scale])

  return (
    <div ref={containerRef} className="canvas-viewport">
      <div className="canvas-viewport__frame" style={{ width: canvas.width * scale, height: canvas.height * scale }}>
        <canvas ref={displayRef} className="canvas-viewport__canvas" />
        {showCrop && cropRect ? (
          <CropOverlay
            cropRect={cropRect}
            imageWidth={canvas.width}
            imageHeight={canvas.height}
            scale={scale}
            aspect={cropAspect}
            onChange={onCropChange}
          />
        ) : null}
      </div>
    </div>
  )
}
