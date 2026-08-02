import { useEffect, useRef, useState } from 'react'
import { fitRectToAspect, type RectAnchor } from '../lib/crop'
import type { ImageRect } from '../lib/types'

type Handle =
  | 'move'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'

interface CropOverlayProps {
  cropRect: ImageRect
  imageWidth: number
  imageHeight: number
  scale: number
  /** Proporción bloqueada (ancho / alto). `null` = redimensionado libre. */
  aspect: number | null
  onChange: (rect: ImageRect) => void
}

const HANDLE_SIZE = 10

/**
 * Con la proporción bloqueada, cada tirador fija el borde opuesto y decide qué
 * medida manda: las esquinas usan la mayor, los laterales el ancho y los
 * tiradores superior/inferior el alto (creciendo de forma centrada).
 */
const ASPECT_CONSTRAINTS: Record<
  Exclude<Handle, 'move'>,
  { anchor: RectAnchor; driver: 'width' | 'height' | 'auto' }
> = {
  'top-left': { anchor: { x: 'right', y: 'bottom' }, driver: 'auto' },
  'top-right': { anchor: { x: 'left', y: 'bottom' }, driver: 'auto' },
  'bottom-left': { anchor: { x: 'right', y: 'top' }, driver: 'auto' },
  'bottom-right': { anchor: { x: 'left', y: 'top' }, driver: 'auto' },
  left: { anchor: { x: 'right', y: 'center' }, driver: 'width' },
  right: { anchor: { x: 'left', y: 'center' }, driver: 'width' },
  top: { anchor: { x: 'center', y: 'bottom' }, driver: 'height' },
  bottom: { anchor: { x: 'center', y: 'top' }, driver: 'height' },
}

function clampRect(rect: ImageRect, maxWidth: number, maxHeight: number): ImageRect {
  const width = Math.max(1, Math.min(rect.width, maxWidth))
  const height = Math.max(1, Math.min(rect.height, maxHeight))
  const x = Math.max(0, Math.min(rect.x, maxWidth - width))
  const y = Math.max(0, Math.min(rect.y, maxHeight - height))

  return { x, y, width, height }
}

function getHandleAtPoint(
  pointX: number,
  pointY: number,
  rect: ImageRect,
  scale: number,
): Handle | null {
  const left = rect.x * scale
  const top = rect.y * scale
  const right = (rect.x + rect.width) * scale
  const bottom = (rect.y + rect.height) * scale
  const threshold = HANDLE_SIZE

  const near = (value: number, target: number) => Math.abs(value - target) <= threshold

  if (near(pointX, left) && near(pointY, top)) return 'top-left'
  if (near(pointX, right) && near(pointY, top)) return 'top-right'
  if (near(pointX, left) && near(pointY, bottom)) return 'bottom-left'
  if (near(pointX, right) && near(pointY, bottom)) return 'bottom-right'
  if (near(pointY, top) && pointX > left && pointX < right) return 'top'
  if (near(pointY, bottom) && pointX > left && pointX < right) return 'bottom'
  if (near(pointX, left) && pointY > top && pointY < bottom) return 'left'
  if (near(pointX, right) && pointY > top && pointY < bottom) return 'right'

  if (pointX > left && pointX < right && pointY > top && pointY < bottom) {
    return 'move'
  }

  return null
}

export function CropOverlay({
  cropRect,
  imageWidth,
  imageHeight,
  scale,
  aspect,
  onChange,
}: CropOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    handle: Handle
    startX: number
    startY: number
    startRect: ImageRect
  } | null>(null)
  const [activeHandle, setActiveHandle] = useState<Handle | null>(null)

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current
      const overlay = overlayRef.current
      if (!drag || !overlay) {
        return
      }

      const deltaX = (event.clientX - drag.startX) / scale
      const deltaY = (event.clientY - drag.startY) / scale
      const start = drag.startRect
      let next: ImageRect = { ...start }

      switch (drag.handle) {
        case 'move':
          next = {
            ...start,
            x: start.x + deltaX,
            y: start.y + deltaY,
          }
          break
        case 'top-left':
          next = {
            x: start.x + deltaX,
            y: start.y + deltaY,
            width: start.width - deltaX,
            height: start.height - deltaY,
          }
          break
        case 'top-right':
          next = {
            x: start.x,
            y: start.y + deltaY,
            width: start.width + deltaX,
            height: start.height - deltaY,
          }
          break
        case 'bottom-left':
          next = {
            x: start.x + deltaX,
            y: start.y,
            width: start.width - deltaX,
            height: start.height + deltaY,
          }
          break
        case 'bottom-right':
          next = {
            x: start.x,
            y: start.y,
            width: start.width + deltaX,
            height: start.height + deltaY,
          }
          break
        case 'top':
          next = {
            ...start,
            y: start.y + deltaY,
            height: start.height - deltaY,
          }
          break
        case 'bottom':
          next = {
            ...start,
            height: start.height + deltaY,
          }
          break
        case 'left':
          next = {
            ...start,
            x: start.x + deltaX,
            width: start.width - deltaX,
          }
          break
        case 'right':
          next = {
            ...start,
            width: start.width + deltaX,
          }
          break
      }

      if (aspect && drag.handle !== 'move') {
        const { anchor, driver } = ASPECT_CONSTRAINTS[drag.handle]
        onChange(fitRectToAspect(next, aspect, anchor, imageWidth, imageHeight, driver))
        return
      }

      onChange(clampRect(next, imageWidth, imageHeight))
    }

    const onPointerUp = () => {
      dragRef.current = null
      setActiveHandle(null)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [aspect, imageHeight, imageWidth, onChange, scale])

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const overlay = overlayRef.current
    if (!overlay) {
      return
    }

    const bounds = overlay.getBoundingClientRect()
    const pointX = event.clientX - bounds.left
    const pointY = event.clientY - bounds.top
    const handle = getHandleAtPoint(pointX, pointY, cropRect, scale)

    if (!handle) {
      return
    }

    event.preventDefault()
    dragRef.current = {
      handle,
      startX: event.clientX,
      startY: event.clientY,
      startRect: cropRect,
    }
    setActiveHandle(handle)
  }

  const left = cropRect.x * scale
  const top = cropRect.y * scale
  const width = cropRect.width * scale
  const height = cropRect.height * scale

  return (
    <div
      ref={overlayRef}
      className={`crop-overlay${activeHandle ? ' crop-overlay--active' : ''}`}
      style={{ width: imageWidth * scale, height: imageHeight * scale }}
      onPointerDown={onPointerDown}
    >
      <div className="crop-overlay__shade crop-overlay__shade--top" style={{ height: top }} />
      <div
        className="crop-overlay__shade crop-overlay__shade--bottom"
        style={{ top: top + height, height: imageHeight * scale - top - height }}
      />
      <div
        className="crop-overlay__shade crop-overlay__shade--left"
        style={{ top, left: 0, width: left, height }}
      />
      <div
        className="crop-overlay__shade crop-overlay__shade--right"
        style={{ top, left: left + width, width: imageWidth * scale - left - width, height }}
      />

      <div className="crop-selection" style={{ left, top, width, height }}>
        <span className="crop-handle crop-handle--top-left" />
        <span className="crop-handle crop-handle--top-right" />
        <span className="crop-handle crop-handle--bottom-left" />
        <span className="crop-handle crop-handle--bottom-right" />
      </div>
    </div>
  )
}
