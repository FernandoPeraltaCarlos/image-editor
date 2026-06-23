import { loadImageFromBlob } from './imageCanvas'

const MODELS_PATH = new URL(
  `${import.meta.env.BASE_URL}models/`,
  window.location.origin,
).href

export interface RemoveBackgroundProgress {
  stage: 'download' | 'processing'
  current: number
  total: number
  ratio: number
}

interface RemoveBackgroundOptions {
  onProgress?: (progress: RemoveBackgroundProgress) => void
}

export async function removeBackgroundFromCanvas(
  canvas: HTMLCanvasElement,
  options: RemoveBackgroundOptions = {},
): Promise<HTMLCanvasElement> {
  const { removeBackground } = await import('@imgly/background-removal')

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error('No se pudo preparar la imagen para quitar el fondo'))
        return
      }
      resolve(result)
    }, 'image/png')
  })

  const downloads = new Map<string, { current: number; total: number }>()

  const resultBlob = await removeBackground(blob, {
    publicPath: MODELS_PATH,
    model: 'isnet_quint8',
    output: {
      format: 'image/png',
    },
    progress: (key, current, total) => {
      if (!options.onProgress) {
        return
      }

      if (key.startsWith('fetch')) {
        downloads.set(key, { current, total })
        let downloaded = 0
        let size = 0
        for (const entry of downloads.values()) {
          downloaded += entry.current
          size += entry.total
        }
        options.onProgress({
          stage: 'download',
          current: downloaded,
          total: size,
          ratio: size > 0 ? Math.min(1, downloaded / size) : 0,
        })
        return
      }

      options.onProgress({
        stage: 'processing',
        current,
        total,
        ratio: total > 0 ? Math.min(1, current / total) : 0,
      })
    },
  })

  return loadImageFromBlob(resultBlob)
}
