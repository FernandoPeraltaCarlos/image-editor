import { useCallback, useReducer, useState } from 'react'
import { defaultCropRect, cropCanvas } from '../lib/crop'
import { cloneCanvas, getCanvasDimensions, loadImageFromFile } from '../lib/imageCanvas'
import {
  removeBackgroundFromCanvas,
  type RemoveBackgroundProgress,
} from '../lib/removeBackground'
import { resizeCanvas } from '../lib/resize'
import type { HistoryEntry, ImageRect, Tool } from '../lib/types'

interface HistorySnapshot {
  canvas: HTMLCanvasElement
  label: string
}

interface EditorState {
  canvas: HTMLCanvasElement | null
  fileName: string
  tool: Tool
  cropRect: ImageRect | null
  snapshots: HistorySnapshot[]
  currentIndex: number
  isProcessing: boolean
  error: string | null
}

type EditorAction =
  | { type: 'LOAD_IMAGE'; canvas: HTMLCanvasElement; fileName: string }
  | { type: 'SET_TOOL'; tool: Tool }
  | { type: 'SET_CROP_RECT'; cropRect: ImageRect }
  | { type: 'APPLY_CROP' }
  | { type: 'APPLY_RESIZE'; width: number; height: number }
  | { type: 'REMOVE_BACKGROUND_START' }
  | { type: 'REMOVE_BACKGROUND_SUCCESS'; canvas: HTMLCanvasElement }
  | { type: 'REMOVE_BACKGROUND_ERROR'; error: string }
  | { type: 'UNDO' }
  | { type: 'RESTORE_TO_INDEX'; index: number }
  | { type: 'CLEAR_ERROR' }

function createSnapshot(canvas: HTMLCanvasElement, label: string): HistorySnapshot {
  return {
    canvas: cloneCanvas(canvas),
    label,
  }
}

function commitChange(
  state: EditorState,
  canvas: HTMLCanvasElement,
  label: string,
): EditorState {
  const snapshots = state.snapshots.slice(0, state.currentIndex + 1)
  snapshots.push(createSnapshot(canvas, label))

  return {
    ...state,
    canvas,
    snapshots,
    currentIndex: snapshots.length - 1,
    cropRect: defaultCropRect(canvas.width, canvas.height),
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
    canvas: cloneCanvas(snapshot.canvas),
    currentIndex: index,
    cropRect: defaultCropRect(snapshot.canvas.width, snapshot.canvas.height),
    error: null,
  }
}

function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'LOAD_IMAGE': {
      const snapshot = createSnapshot(action.canvas, 'Imagen original')

      return {
        ...state,
        canvas: cloneCanvas(action.canvas),
        fileName: action.fileName,
        tool: 'crop',
        cropRect: defaultCropRect(action.canvas.width, action.canvas.height),
        snapshots: [snapshot],
        currentIndex: 0,
        isProcessing: false,
        error: null,
      }
    }

    case 'SET_TOOL': {
      const next: EditorState = { ...state, tool: action.tool, error: null }

      if (action.tool === 'crop' && state.canvas && !state.cropRect) {
        next.cropRect = defaultCropRect(state.canvas.width, state.canvas.height)
      }

      return next
    }

    case 'SET_CROP_RECT':
      return { ...state, cropRect: action.cropRect }

    case 'APPLY_CROP': {
      if (!state.canvas || !state.cropRect) {
        return state
      }

      const cropped = cropCanvas(state.canvas, state.cropRect)
      return commitChange(state, cropped, 'Recorte')
    }

    case 'APPLY_RESIZE': {
      if (!state.canvas) {
        return state
      }

      const resized = resizeCanvas(state.canvas, action.width, action.height)
      return commitChange(state, resized, 'Redimensionar')
    }

    case 'REMOVE_BACKGROUND_START':
      return { ...state, isProcessing: true, error: null }

    case 'REMOVE_BACKGROUND_SUCCESS': {
      if (!state.canvas) {
        return { ...state, isProcessing: false }
      }

      return {
        ...commitChange(state, action.canvas, 'Fondo eliminado'),
        isProcessing: false,
      }
    }

    case 'REMOVE_BACKGROUND_ERROR':
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
  snapshots: [],
  currentIndex: -1,
  isProcessing: false,
  error: null,
}

export function useImageEditor() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [bgProgress, setBgProgress] = useState<RemoveBackgroundProgress | null>(null)

  const loadFile = useCallback(async (file: File) => {
    const canvas = await loadImageFromFile(file)
    dispatch({ type: 'LOAD_IMAGE', canvas, fileName: file.name })
  }, [])

  const setTool = useCallback((tool: Tool) => {
    dispatch({ type: 'SET_TOOL', tool })
  }, [])

  const setCropRect = useCallback((cropRect: ImageRect) => {
    dispatch({ type: 'SET_CROP_RECT', cropRect })
  }, [])

  const applyCrop = useCallback(() => {
    dispatch({ type: 'APPLY_CROP' })
  }, [])

  const applyResize = useCallback((width: number, height: number) => {
    dispatch({ type: 'APPLY_RESIZE', width, height })
  }, [])

  const removeBackground = useCallback(async () => {
    if (!state.canvas) {
      return
    }

    dispatch({ type: 'REMOVE_BACKGROUND_START' })
    setBgProgress(null)

    try {
      const result = await removeBackgroundFromCanvas(state.canvas, {
        onProgress: setBgProgress,
      })
      dispatch({ type: 'REMOVE_BACKGROUND_SUCCESS', canvas: result })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo eliminar el fondo'
      dispatch({ type: 'REMOVE_BACKGROUND_ERROR', error: message })
    } finally {
      setBgProgress(null)
    }
  }, [state.canvas])

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
    applyCrop,
    applyResize,
    removeBackground,
    undo,
    restoreTo,
    restoreOriginal,
    clearError,
  }
}
