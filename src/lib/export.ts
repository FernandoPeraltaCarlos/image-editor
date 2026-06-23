import { canvasToBlob } from './imageCanvas'
import type { ExportFormat } from './types'

const EXTENSIONS: Record<ExportFormat, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

export function getExtension(format: ExportFormat): string {
  return EXTENSIONS[format]
}

export function buildExportFilename(baseName: string, format: ExportFormat): string {
  const stem = baseName.replace(/\.[^.]+$/, '') || 'imagen'
  return `${stem}.${getExtension(format)}`
}

export async function downloadCanvas(
  canvas: HTMLCanvasElement,
  filename: string,
  format: ExportFormat,
  quality = 0.92,
): Promise<void> {
  const blob = await canvasToBlob(canvas, format, quality)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function isWebpSupported(): boolean {
  const canvas = document.createElement('canvas')
  return canvas.toDataURL('image/webp').startsWith('data:image/webp')
}
