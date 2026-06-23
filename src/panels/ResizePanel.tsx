import { useState } from 'react'

interface ResizePanelProps {
  width: number
  height: number
  disabled: boolean
  onApply: (width: number, height: number) => void
}

export function ResizePanel({ width, height, disabled, onApply }: ResizePanelProps) {
  const [nextWidth, setNextWidth] = useState(() => String(width))
  const [nextHeight, setNextHeight] = useState(() => String(height))
  const [locked, setLocked] = useState(true)

  const aspectRatio = width / height

  const parsedWidth = Number.parseInt(nextWidth, 10)
  const parsedHeight = Number.parseInt(nextHeight, 10)
  const isValid =
    Number.isFinite(parsedWidth) &&
    Number.isFinite(parsedHeight) &&
    parsedWidth > 0 &&
    parsedHeight > 0

  const handleWidthChange = (value: string) => {
    setNextWidth(value)

    if (locked) {
      const parsed = Number.parseInt(value, 10)
      if (Number.isFinite(parsed) && parsed > 0) {
        setNextHeight(String(Math.max(1, Math.round(parsed / aspectRatio))))
      }
    }
  }

  const handleHeightChange = (value: string) => {
    setNextHeight(value)

    if (locked) {
      const parsed = Number.parseInt(value, 10)
      if (Number.isFinite(parsed) && parsed > 0) {
        setNextWidth(String(Math.max(1, Math.round(parsed * aspectRatio))))
      }
    }
  }

  return (
    <div className="panel">
      <h2>Redimensionar</h2>
      <p className="panel__hint">
        Activa el candado para mantener la proporción original. Si lo desactivas, puedes editar
        ancho y alto de forma independiente y la imagen puede deformarse.
      </p>

      <div className="field-grid">
        <label className="field">
          <span>Ancho (px)</span>
          <input
            type="number"
            min={1}
            value={nextWidth}
            disabled={disabled}
            onChange={(event) => handleWidthChange(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Alto (px)</span>
          <input
            type="number"
            min={1}
            value={nextHeight}
            disabled={disabled}
            onChange={(event) => handleHeightChange(event.target.value)}
          />
        </label>
      </div>

      <label className="field field--checkbox">
        <input
          type="checkbox"
          checked={locked}
          disabled={disabled}
          onChange={(event) => setLocked(event.target.checked)}
        />
        <span>Bloquear proporción</span>
      </label>

      <button
        type="button"
        className="primary-button"
        disabled={disabled || !isValid}
        onClick={() => onApply(parsedWidth, parsedHeight)}
      >
        Aplicar tamaño
      </button>
    </div>
  )
}
