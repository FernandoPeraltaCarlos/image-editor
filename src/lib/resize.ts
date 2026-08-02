import { createCanvas } from './imageCanvas'

/**
 * Límite por eje. Mantiene las reservas de memoria en un rango razonable y
 * queda por debajo del tamaño máximo de canvas de los navegadores habituales
 * (Safari es el más restrictivo: ~16384 px por eje).
 */
export const MAX_DIMENSION = 8192

type PicaStatic = (typeof import('pica'))['default']
type PicaInstance = ReturnType<PicaStatic>

let picaPromise: Promise<PicaInstance> | null = null

function getPica(): Promise<PicaInstance> {
  // Import dinámico: pica (worker inline + wasm en base64) queda fuera del
  // chunk principal y solo se descarga al aplicar el primer redimensionado.
  // Instancia única: pica reutiliza su pool de webworkers entre operaciones.
  picaPromise ??= import('pica').then((mod) => mod.default())
  return picaPromise
}

export function isValidDimension(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= MAX_DIMENSION
}

/**
 * Redimensionado de alta calidad con pica (filtro mks2013, por bloques y en
 * webworkers). Es el que se usa para el resultado final: calidad estable entre
 * navegadores tanto al reducir como al ampliar.
 */
export async function resizeCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): Promise<HTMLCanvasElement> {
  const targetWidth = Math.round(width)
  const targetHeight = Math.round(height)

  if (!isValidDimension(targetWidth) || !isValidDimension(targetHeight)) {
    throw new Error(`Las dimensiones deben estar entre 1 y ${MAX_DIMENSION} px`)
  }

  const pica = await getPica()
  const output = createCanvas(targetWidth, targetHeight)
  await pica.resize(canvas, output)
  return output
}

function drawScaled(
  source: HTMLCanvasElement,
  width: number,
  height: number,
): HTMLCanvasElement {
  const output = createCanvas(width, height)
  const ctx = output.getContext('2d')

  if (!ctx) {
    throw new Error('No se pudo obtener el contexto del canvas')
  }

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, width, height)
  return output
}

/**
 * Redimensionado síncrono y barato para la vista previa.
 *
 * Un único `drawImage` usa filtrado bilineal, que solo muestrea ~2×2 píxeles
 * del origen por píxel de destino: al reducir más de 2× produce aliasing. Para
 * evitarlo se reduce a la mitad de forma progresiva, y solo el eje que siga
 * estando a más de 2× de su destino (así una reducción fuerte en un eje no
 * infla el otro con canvases intermedios gigantes).
 *
 * Devuelve el canvas original si ya tiene el tamaño pedido.
 */
export function resizeCanvasPreview(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): HTMLCanvasElement {
  const targetWidth = Math.max(1, Math.round(width))
  const targetHeight = Math.max(1, Math.round(height))

  let current = canvas
  let currentWidth = canvas.width
  let currentHeight = canvas.height

  while (currentWidth > targetWidth * 2 || currentHeight > targetHeight * 2) {
    currentWidth = currentWidth > targetWidth * 2 ? Math.round(currentWidth / 2) : currentWidth
    currentHeight =
      currentHeight > targetHeight * 2 ? Math.round(currentHeight / 2) : currentHeight
    current = drawScaled(current, currentWidth, currentHeight)
  }

  if (currentWidth === targetWidth && currentHeight === targetHeight) {
    return current
  }

  return drawScaled(current, targetWidth, targetHeight)
}
