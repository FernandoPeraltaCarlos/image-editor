import { useEffect, useMemo, useRef, useState } from 'react'
import { CropOverlay } from './CropOverlay'
import { resizeCanvasPreview } from '../lib/resize'
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

    // Las notificaciones del observer se agrupan por frame: mientras se
    // arrastra el borde de la ventana evita rehacer la vista previa (que
    // reescala la imagen completa) decenas de veces por segundo.
    let frame = 0
    const observer = new ResizeObserver(() => {
      if (frame) {
        return
      }
      frame = requestAnimationFrame(() => {
        frame = 0
        setAvailableWidth(container.clientWidth)
      })
    })

    observer.observe(container)
    setAvailableWidth(container.clientWidth)

    return () => {
      observer.disconnect()
      if (frame) {
        cancelAnimationFrame(frame)
      }
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

    const cssWidth = Math.round(canvas.width * scale)
    const cssHeight = Math.round(canvas.height * scale)

    // El backing store se dimensiona en píxeles físicos para que la vista
    // previa no se vea borrosa en pantallas HiDPI; el tamaño CSS (y con él la
    // geometría del overlay de recorte) no cambia. Se limita a la resolución
    // del original: ampliar el backing store más allá no aporta detalle y
    // cuadruplica la memoria en pantallas 2×.
    const dpr = Math.min(
      window.devicePixelRatio || 1,
      cssWidth > 0 ? canvas.width / cssWidth : 1,
      cssHeight > 0 ? canvas.height / cssHeight : 1,
    )
    const deviceWidth = Math.max(1, Math.round(cssWidth * dpr))
    const deviceHeight = Math.max(1, Math.round(cssHeight * dpr))

    displayCanvas.width = deviceWidth
    displayCanvas.height = deviceHeight
    displayCanvas.style.width = `${cssWidth}px`
    displayCanvas.style.height = `${cssHeight}px`

    const ctx = displayCanvas.getContext('2d')
    if (!ctx) {
      return
    }

    ctx.clearRect(0, 0, deviceWidth, deviceHeight)
    // resizeCanvasPreview reduce por pasos con suavizado de alta calidad:
    // evita el aliasing de un único drawImage al encoger imágenes grandes.
    const scaled = resizeCanvasPreview(canvas, deviceWidth, deviceHeight)
    ctx.drawImage(scaled, 0, 0)
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
