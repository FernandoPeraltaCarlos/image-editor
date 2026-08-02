import { createCanvas } from './imageCanvas'
import type { ImageRect } from './types'

export function normalizeRect(rect: ImageRect, maxWidth: number, maxHeight: number): ImageRect {
  const x = Math.max(0, Math.min(rect.x, maxWidth - 1))
  const y = Math.max(0, Math.min(rect.y, maxHeight - 1))
  const width = Math.max(1, Math.min(rect.width, maxWidth - x))
  const height = Math.max(1, Math.min(rect.height, maxHeight - y))

  return { x, y, width, height }
}

export function cropCanvas(canvas: HTMLCanvasElement, rect: ImageRect): HTMLCanvasElement {
  const normalized = normalizeRect(rect, canvas.width, canvas.height)
  const output = createCanvas(normalized.width, normalized.height)
  const ctx = output.getContext('2d')

  if (!ctx) {
    throw new Error('No se pudo obtener el contexto del canvas')
  }

  ctx.drawImage(
    canvas,
    normalized.x,
    normalized.y,
    normalized.width,
    normalized.height,
    0,
    0,
    normalized.width,
    normalized.height,
  )

  return output
}

export interface RectAnchor {
  x: 'left' | 'center' | 'right'
  y: 'top' | 'center' | 'bottom'
}

/**
 * Ajusta un rectángulo para que respete una proporción fija.
 *
 * - `anchor` indica qué borde/esquina queda fijo (el lado opuesto al que se
 *   está arrastrando o editando).
 * - `driver` indica qué medida manda: la otra se deduce de la proporción.
 *   Con `auto` (esquinas) manda la medida que dé el rectángulo más grande.
 *
 * El resultado siempre cabe dentro de la imagen: si no cabe, se reduce
 * manteniendo la proporción en lugar de recortar solo un lado.
 */
export function fitRectToAspect(
  rect: ImageRect,
  aspect: number,
  anchor: RectAnchor,
  maxWidth: number,
  maxHeight: number,
  driver: 'width' | 'height' | 'auto' = 'auto',
): ImageRect {
  if (!Number.isFinite(aspect) || aspect <= 0) {
    return normalizeRect(rect, maxWidth, maxHeight)
  }

  const baseWidth = Math.max(1, rect.width)
  const baseHeight = Math.max(1, rect.height)
  const right = rect.x + baseWidth
  const bottom = rect.y + baseHeight
  const centerX = rect.x + baseWidth / 2
  const centerY = rect.y + baseHeight / 2

  let width =
    driver === 'width'
      ? baseWidth
      : driver === 'height'
        ? baseHeight * aspect
        : Math.max(baseWidth, baseHeight * aspect)
  let height = width / aspect

  const availableWidth =
    anchor.x === 'left'
      ? maxWidth - rect.x
      : anchor.x === 'right'
        ? right
        : 2 * Math.min(centerX, maxWidth - centerX)

  const availableHeight =
    anchor.y === 'top'
      ? maxHeight - rect.y
      : anchor.y === 'bottom'
        ? bottom
        : 2 * Math.min(centerY, maxHeight - centerY)

  const factor = Math.min(1, availableWidth / width, availableHeight / height)
  if (factor > 0 && factor < 1) {
    width *= factor
    height = width / aspect
  }

  width = Math.max(1, Math.round(width))
  height = Math.max(1, Math.round(height))

  const x =
    anchor.x === 'left' ? rect.x : anchor.x === 'right' ? right - width : centerX - width / 2
  const y =
    anchor.y === 'top' ? rect.y : anchor.y === 'bottom' ? bottom - height : centerY - height / 2

  return normalizeRect(
    { x: Math.round(x), y: Math.round(y), width, height },
    maxWidth,
    maxHeight,
  )
}

export function defaultCropRect(width: number, height: number): ImageRect {
  const marginX = Math.round(width * 0.1)
  const marginY = Math.round(height * 0.1)

  return {
    x: marginX,
    y: marginY,
    width: Math.max(1, width - marginX * 2),
    height: Math.max(1, height - marginY * 2),
  }
}
