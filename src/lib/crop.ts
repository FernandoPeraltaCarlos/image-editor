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
