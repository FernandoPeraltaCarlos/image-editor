import { useCallback, useReducer, useRef, useState } from 'react'
import { defaultCropRect, cropCanvas, fitRectToAspect } from '../lib/crop'
import { getCanvasDimensions, loadImageFromFile } from '../lib/imageCanvas'
import {
  removeBackgroundFromCanvas,
  type RemoveBackgroundProgress,
} from '../lib/removeBackground'
import { resizeCanvas } from '../lib/resize'
import type { HistoryEntry, ImageRect, Tool } from '../lib/types'

/**
 * Convención de inmutabilidad: los canvases confirmados nunca se mutan. Todas
 * las operaciones (recorte, redimensionado, quitar fondo…) producen un canvas
 * nuevo, así que el historial puede compartir referencias con `state.canvas`
 * sin clonar (un canvas RGBA grande puede ocupar cientos de MB).
 */
interface HistorySnapshot {
  canvas: HTMLCanvasElement
  label: string
}

/**
 * Tope de entradas del historial para acotar la memoria. Al superarlo se
 * conserva siempre la primera entrada (la imagen original, que alimenta
 * «Restaurar original») y se descartan las más antiguas del resto.
 */
const MAX_HISTORY = 20

interface EditorState {
  canvas: HTMLCanvasElement | null
  fileName: string
  tool: Tool
  cropRect: ImageRect | null
  /** Proporción bloqueada del recorte (ancho / alto). `null` = selección libre. */
  cropAspect: number | null
  snapshots: HistorySnapshot[]
  currentIndex: number
  isProcessing: boolean
  error: string | null
}

type EditorAction =
  | { type: 'LOAD_IMAGE'; canvas: HTMLCanvasElement; fileName: string }
  | { type: 'SET_TOOL'; tool: Tool }
  | { type: 'SET_CROP_RECT'; cropRect: ImageRect }
  | { type: 'SET_CROP_ASPECT'; aspect: number | null }
  | { type: 'APPLY_CROP' }
  // Operaciones asíncronas (redimensionar, quitar fondo…): el trabajo pesado
  // ocurre fuera del reducer y aquí solo se registra el resultado.
  | { type: 'PROCESS_START' }
  | { type: 'PROCESS_SUCCESS'; canvas: HTMLCanvasElement; label: string }
  | { type: 'PROCESS_ERROR'; error: string }
  | { type: 'UNDO' }
  | { type: 'RESTORE_TO_INDEX'; index: number }
  | { type: 'CLEAR_ERROR' }

/** Selección inicial para un lienzo, respetando la proporción bloqueada si la hay. */
function initialCropRect(
  width: number,
  height: number,
  aspect: number | null,
): ImageRect {
  const rect = defaultCropRect(width, height)

  if (!aspect) {
    return rect
  }

  return fitRectToAspect(rect, aspect, { x: 'center', y: 'center' }, width, height)
}

function commitChange(
  state: EditorState,
  canvas: HTMLCanvasElement,
  label: string,
): EditorState {
  let snapshots = state.snapshots.slice(0, state.currentIndex + 1)
  snapshots.push({ canvas, label })

  if (snapshots.length > MAX_HISTORY) {
    snapshots = [snapshots[0], ...snapshots.slice(snapshots.length - (MAX_HISTORY - 1))]
  }

  return {
    ...state,
    canvas,
    snapshots,
    currentIndex: snapshots.length - 1,
    cropRect: initialCropRect(canvas.width, canvas.height, state.cropAspect),
    error: null,
  }
}

function restoreToIndex(state: EditorState, index: number): EditorState {
  const snapshot = state.snapshots[index]
  if (!snapshot) {
    return state
  }

  return {
    ...state,
    canvas: snapshot.canvas,
    currentIndex: index,
    cropRect: initialCropRect(
      snapshot.canvas.width,
      snapshot.canvas.height,
      state.cropAspect,
    ),
    error: null,
  }
}

function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'LOAD_IMAGE': {
      return {
        ...state,
        canvas: action.canvas,
        fileName: action.fileName,
        tool: 'crop',
        cropRect: defaultCropRect(action.canvas.width, action.canvas.height),
        cropAspect: null,
        snapshots: [{ canvas: action.canvas, label: 'Imagen original' }],
        currentIndex: 0,
        isProcessing: false,
        error: null,
      }
    }

    case 'SET_TOOL': {
      const next: EditorState = { ...state, tool: action.tool, error: null }

      if (action.tool === 'crop' && state.canvas && !state.cropRect) {
        next.cropRect = initialCropRect(
          state.canvas.width,
          state.canvas.height,
          state.cropAspect,
        )
      }

      return next
    }

    case 'SET_CROP_RECT':
      return { ...state, cropRect: action.cropRect }

    case 'SET_CROP_ASPECT': {
      if (!action.aspect || !state.canvas || !state.cropRect) {
        return { ...state, cropAspect: action.aspect }
      }

      // Al bloquear, la selección actual pasa a cumplir la proporción de inmediato.
      return {
        ...state,
        cropAspect: action.aspect,
        cropRect: fitRectToAspect(
          state.cropRect,
          action.aspect,
          { x: 'left', y: 'top' },
          state.canvas.width,
          state.canvas.height,
          'width',
        ),
      }
    }

    case 'APPLY_CROP': {
      if (!state.canvas || !state.cropRect) {
        return state
      }

      const cropped = cropCanvas(state.canvas, state.cropRect)
      return commitChange(state, cropped, 'Recorte')
    }

    case 'PROCESS_START':
      return { ...state, isProcessing: true, error: null }

    case 'PROCESS_SUCCESS': {
      if (!state.canvas) {
        return { ...state, isProcessing: false }
      }

      return {
        ...commitChange(state, action.canvas, action.label),
        isProcessing: false,
      }
    }

    case 'PROCESS_ERROR':
      return { ...state, isProcessing: false, error: action.error }

    case 'UNDO': {
      if (state.currentIndex <= 0) {
        return state
      }

      return restoreToIndex(state, state.currentIndex - 1)
    }

    case 'RESTORE_TO_INDEX': {
      if (
        action.index < 0 ||
        action.index >= state.snapshots.length ||
        action.index === state.currentIndex
      ) {
        return state
      }

      return restoreToIndex(state, action.index)
    }

    case 'CLEAR_ERROR':
      return { ...state, error: null }

    default:
      return state
  }
}

const initialState: EditorState = {
  canvas: null,
  fileName: 'imagen',
  tool: 'crop',
  cropRect: null,
  cropAspect: null,
  snapshots: [],
  currentIndex: -1,
  isProcessing: false,
  error: null,
}

export function useImageEditor() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [bgProgress, setBgProgress] = useState<RemoveBackgroundProgress | null>(null)

  // Generación de sesión: se incrementa al cargar una imagen nueva. Las
  // operaciones asíncronas la capturan al empezar y descartan su resultado si
  // cambió, para no cometer resultados de una imagen anterior sobre la nueva.
  const sessionRef = useRef(0)

  const loadFile = useCallback(async (file: File) => {
    const canvas = await loadImageFromFile(file)
    sessionRef.current += 1
    dispatch({ type: 'LOAD_IMAGE', canvas, fileName: file.name })
  }, [])

  const setTool = useCallback((tool: Tool) => {
    dispatch({ type: 'SET_TOOL', tool })
  }, [])

  const setCropRect = useCallback((cropRect: ImageRect) => {
    dispatch({ type: 'SET_CROP_RECT', cropRect })
  }, [])

  const setCropAspect = useCallback((aspect: number | null) => {
    dispatch({ type: 'SET_CROP_ASPECT', aspect })
  }, [])

  const applyCrop = useCallback(() => {
    dispatch({ type: 'APPLY_CROP' })
  }, [])

  const applyResize = useCallback(
    async (width: number, height: number) => {
      if (!state.canvas || state.isProcessing) {
        return
      }

      // Sin cambios de tamaño no hay nada que hacer (evita entradas de
      // historial duplicadas).
      if (width === state.canvas.width && height === state.canvas.height) {
        return
      }

      const session = sessionRef.current
      dispatch({ type: 'PROCESS_START' })

      try {
        const result = await resizeCanvas(state.canvas, width, height)
        if (session !== sessionRef.current) {
          return
        }
        dispatch({ type: 'PROCESS_SUCCESS', canvas: result, label: 'Redimensionar' })
      } catch (error) {
        if (session !== sessionRef.current) {
          return
        }
        const message =
          error instanceof Error ? error.message : 'No se pudo redimensionar la imagen'
        dispatch({ type: 'PROCESS_ERROR', error: message })
      }
    },
    [state.canvas, state.isProcessing],
  )

  const removeBackground = useCallback(async () => {
    if (!state.canvas || state.isProcessing) {
      return
    }

    const session = sessionRef.current
    dispatch({ type: 'PROCESS_START' })
    setBgProgress(null)

    try {
      const result = await removeBackgroundFromCanvas(state.canvas, {
        onProgress: setBgProgress,
      })
      if (session !== sessionRef.current) {
        return
      }
      dispatch({ type: 'PROCESS_SUCCESS', canvas: result, label: 'Fondo eliminado' })
    } catch (error) {
      if (session !== sessionRef.current) {
        return
      }
      const message =
        error instanceof Error ? error.message : 'No se pudo eliminar el fondo'
      dispatch({ type: 'PROCESS_ERROR', error: message })
    } finally {
      setBgProgress(null)
    }
  }, [state.canvas, state.isProcessing])

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' })
  }, [])

  const restoreTo = useCallback((index: number) => {
    dispatch({ type: 'RESTORE_TO_INDEX', index })
  }, [])

  const restoreOriginal = useCallback(() => {
    dispatch({ type: 'RESTORE_TO_INDEX', index: 0 })
  }, [])

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' })
  }, [])

  const dimensions = state.canvas ? getCanvasDimensions(state.canvas) : null

  const historyEntries: HistoryEntry[] = state.snapshots.map((snapshot) => ({
    label: snapshot.label,
    width: snapshot.canvas.width,
    height: snapshot.canvas.height,
  }))

  return {
    canvas: state.canvas,
    fileName: state.fileName,
    tool: state.tool,
    cropRect: state.cropRect,
    cropAspect: state.cropAspect,
    historyEntries,
    currentHistoryIndex: state.currentIndex,
    canUndo: state.currentIndex > 0,
    isProcessing: state.isProcessing,
    bgProgress,
    error: state.error,
    dimensions,
    loadFile,
    setTool,
    setCropRect,
    setCropAspect,
    applyCrop,
    applyResize,
    removeBackground,
    undo,
    restoreTo,
    restoreOriginal,
    clearError,
  }
}
