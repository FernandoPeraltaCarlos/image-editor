import { useCallback, useReducer, useState } from 'react'
import { defaultCropRect, cropCanvas } from '../lib/crop'
import { cloneCanvas, getCanvasDimensions, loadImageFromFile } from '../lib/imageCanvas'
import {
  removeBackgroundFromCanvas,
  type RemoveBackgroundProgress,
} from '../lib/removeBackground'
import { resizeCanvas } from '../lib/resize'
import type { ImageRect, Tool } from '../lib/types'

const MAX_HISTORY = 10

interface EditorState {
  canvas: HTMLCanvasElement | null
  fileName: string
  tool: Tool
  cropRect: ImageRect | null
  history: HTMLCanvasElement[]
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
  | { type: 'CLEAR_ERROR' }

function pushHistory(state: EditorState, canvas: HTMLCanvasElement): HTMLCanvasElement[] {
  const snapshot = cloneCanvas(canvas)
  const nextHistory = [...state.history, snapshot]
  return nextHistory.slice(-MAX_HISTORY)
}

function reducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'LOAD_IMAGE':
      return {
        ...state,
        canvas: action.canvas,
        fileName: action.fileName,
        tool: 'crop',
        cropRect: defaultCropRect(action.canvas.width, action.canvas.height),
        history: [],
        isProcessing: false,
        error: null,
      }

    case 'SET_TOOL': {
      const next: EditorState = { ...state, tool: action.tool, error: null }

      if (
        action.tool === 'crop' &&
        state.canvas &&
        !state.cropRect
      ) {
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

      const history = pushHistory(state, state.canvas)
      const cropped = cropCanvas(state.canvas, state.cropRect)

      return {
        ...state,
        canvas: cropped,
        history,
        cropRect: defaultCropRect(cropped.width, cropped.height),
        error: null,
      }
    }

    case 'APPLY_RESIZE': {
      if (!state.canvas) {
        return state
      }

      const history = pushHistory(state, state.canvas)
      const resized = resizeCanvas(state.canvas, action.width, action.height)

      return {
        ...state,
        canvas: resized,
        history,
        cropRect: state.cropRect
          ? defaultCropRect(resized.width, resized.height)
          : null,
        error: null,
      }
    }

    case 'REMOVE_BACKGROUND_START':
      return { ...state, isProcessing: true, error: null }

    case 'REMOVE_BACKGROUND_SUCCESS': {
      if (!state.canvas) {
        return { ...state, isProcessing: false }
      }

      return {
        ...state,
        canvas: action.canvas,
        history: pushHistory(state, state.canvas),
        cropRect: defaultCropRect(action.canvas.width, action.canvas.height),
        isProcessing: false,
        error: null,
      }
    }

    case 'REMOVE_BACKGROUND_ERROR':
      return { ...state, isProcessing: false, error: action.error }

    case 'UNDO': {
      if (state.history.length === 0 || !state.canvas) {
        return state
      }

      const previous = state.history[state.history.length - 1]
      const history = state.history.slice(0, -1)

      return {
        ...state,
        canvas: cloneCanvas(previous),
        history,
        cropRect: defaultCropRect(previous.width, previous.height),
        error: null,
      }
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
  history: [],
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

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' })
  }, [])

  const dimensions = state.canvas ? getCanvasDimensions(state.canvas) : null

  return {
    canvas: state.canvas,
    fileName: state.fileName,
    tool: state.tool,
    cropRect: state.cropRect,
    historyLength: state.history.length,
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
    clearError,
  }
}
