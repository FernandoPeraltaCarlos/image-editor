import type { ImageDimensions } from './types'

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

export function loadImageFromFile(file: File): Promise<HTMLCanvasElement> {
  return loadImageFromUrl(URL.createObjectURL(file))
}

export function loadImageFromBlob(blob: Blob): Promise<HTMLCanvasElement> {
  return loadImageFromUrl(URL.createObjectURL(blob))
}

function loadImageFromUrl(url: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => {
      const canvas = createCanvas(image.naturalWidth, image.naturalHeight)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('No se pudo obtener el contexto del canvas'))
        return
      }

      ctx.drawImage(image, 0, 0)
      URL.revokeObjectURL(url)
      resolve(canvas)
    }

    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo cargar la imagen'))
    }

    image.src = url
  })
}

export function cloneCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = createCanvas(source.width, source.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('No se pudo obtener el contexto del canvas')
  }

  ctx.drawImage(source, 0, 0)
  return canvas
}

export function getCanvasDimensions(canvas: HTMLCanvasElement): ImageDimensions {
  return {
    width: canvas.width,
    height: canvas.height,
  }
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('No se pudo generar el blob de la imagen'))
          return
        }
        resolve(blob)
      },
      mimeType,
      quality,
    )
  })
}
