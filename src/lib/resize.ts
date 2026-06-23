import { createCanvas } from './imageCanvas'

export function resizeCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): HTMLCanvasElement {
  const nextWidth = Math.max(1, Math.round(width))
  const nextHeight = Math.max(1, Math.round(height))
  const output = createCanvas(nextWidth, nextHeight)
  const ctx = output.getContext('2d')

  if (!ctx) {
    throw new Error('No se pudo obtener el contexto del canvas')
  }

  ctx.drawImage(canvas, 0, 0, nextWidth, nextHeight)
  return output
}
