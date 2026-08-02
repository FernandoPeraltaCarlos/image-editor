import { useState } from 'react'
import { defaultCropRect, fitRectToAspect } from '../lib/crop'
import type { ImageRect } from '../lib/types'

interface CropPanelProps {
  rect: ImageRect
  imageWidth: number
  imageHeight: number
  /** Proporción bloqueada (ancho / alto). `null` = selección libre. */
  aspect: number | null
  disabled: boolean
  onChange: (rect: ImageRect) => void
  onAspectChange: (aspect: number | null) => void
  onApply: () => void
}

type DraftField = 'x' | 'y' | 'width' | 'height'
type Draft = Record<DraftField, string>

function toDraft(rect: ImageRect): Draft {
  return {
    x: String(Math.round(rect.x)),
    y: String(Math.round(rect.y)),
    width: String(Math.round(rect.width)),
    height: String(Math.round(rect.height)),
  }
}

function rectsEqual(a: ImageRect, b: ImageRect): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}

function formatAspect(aspect: number): string {
  return aspect >= 1 ? `${(aspect).toFixed(2)}:1` : `1:${(1 / aspect).toFixed(2)}`
}

export function CropPanel({
  rect,
  imageWidth,
  imageHeight,
  aspect,
  disabled,
  onChange,
  onAspectChange,
  onApply,
}: CropPanelProps) {
  const [draft, setDraft] = useState(() => toDraft(rect))
  const [syncedRect, setSyncedRect] = useState(rect)

  // El rectángulo también cambia al arrastrarlo en el lienzo: los inputs se
  // sincronizan con el valor real en cuanto llega desde fuera.
  if (!rectsEqual(rect, syncedRect)) {
    setSyncedRect(rect)
    setDraft(toDraft(rect))
  }

  const emit = (next: ImageRect) => {
    const normalized: ImageRect = {
      x: Math.round(next.x),
      y: Math.round(next.y),
      width: Math.round(next.width),
      height: Math.round(next.height),
    }

    // Reflejamos siempre el valor final (ya ajustado a la proporción y a los
    // límites de la imagen) para que los inputs no muestren números imposibles.
    setSyncedRect(normalized)
    setDraft(toDraft(normalized))

    if (!rectsEqual(normalized, rect)) {
      onChange(normalized)
    }
  }

  const commitPosition = (field: 'x' | 'y', value: number) => {
    if (field === 'x') {
      emit({ ...rect, x: clamp(value, 0, Math.max(0, imageWidth - rect.width)) })
      return
    }

    emit({ ...rect, y: clamp(value, 0, Math.max(0, imageHeight - rect.height)) })
  }

  const commitSize = (field: 'width' | 'height', value: number) => {
    if (aspect) {
      // Con la proporción bloqueada la medida escrita manda y la otra se deduce;
      // la esquina superior izquierda queda fija.
      const driven =
        field === 'width' ? { ...rect, width: value } : { ...rect, height: value }

      emit(
        fitRectToAspect(
          driven,
          aspect,
          { x: 'left', y: 'top' },
          imageWidth,
          imageHeight,
          field,
        ),
      )
      return
    }

    if (field === 'width') {
      emit({ ...rect, width: clamp(value, 1, Math.max(1, imageWidth - rect.x)) })
      return
    }

    emit({ ...rect, height: clamp(value, 1, Math.max(1, imageHeight - rect.y)) })
  }

  const handleChange = (field: DraftField, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }))

    const parsed = Number.parseInt(value, 10)
    if (!Number.isFinite(parsed)) {
      return
    }

    if (field === 'x' || field === 'y') {
      commitPosition(field, parsed)
      return
    }

    if (parsed < 1) {
      return
    }

    commitSize(field, parsed)
  }

  // Si el campo quedó vacío o con un valor inválido, restauramos el valor real.
  const handleBlur = (field: DraftField) => {
    const parsed = Number.parseInt(draft[field], 10)
    const isValid =
      Number.isFinite(parsed) && (field === 'x' || field === 'y' ? parsed >= 0 : parsed >= 1)

    if (!isValid) {
      setDraft(toDraft(rect))
    }
  }

  const handleReset = () => {
    const next = defaultCropRect(imageWidth, imageHeight)
    emit(
      aspect
        ? fitRectToAspect(next, aspect, { x: 'center', y: 'center' }, imageWidth, imageHeight)
        : next,
    )
  }

  const handleSelectAll = () => {
    const next: ImageRect = { x: 0, y: 0, width: imageWidth, height: imageHeight }
    emit(
      aspect
        ? fitRectToAspect(next, aspect, { x: 'center', y: 'center' }, imageWidth, imageHeight)
        : next,
    )
  }

  return (
    <div className="panel">
      <h2>Recortar</h2>
      <p className="panel__hint">
        Arrastra el recuadro o sus esquinas para definir el área, o escribe las medidas exactas.
      </p>

      <div className="field-grid">
        <label className="field">
          <span>Ancho (px)</span>
          <input
            type="number"
            min={1}
            max={imageWidth}
            value={draft.width}
            disabled={disabled}
            onChange={(event) => handleChange('width', event.target.value)}
            onBlur={() => handleBlur('width')}
          />
        </label>

        <label className="field">
          <span>Alto (px)</span>
          <input
            type="number"
            min={1}
            max={imageHeight}
            value={draft.height}
            disabled={disabled}
            onChange={(event) => handleChange('height', event.target.value)}
            onBlur={() => handleBlur('height')}
          />
        </label>
      </div>

      <div className="field-grid">
        <label className="field">
          <span>Posición X (px)</span>
          <input
            type="number"
            min={0}
            max={Math.max(0, imageWidth - rect.width)}
            value={draft.x}
            disabled={disabled}
            onChange={(event) => handleChange('x', event.target.value)}
            onBlur={() => handleBlur('x')}
          />
        </label>

        <label className="field">
          <span>Posición Y (px)</span>
          <input
            type="number"
            min={0}
            max={Math.max(0, imageHeight - rect.height)}
            value={draft.y}
            disabled={disabled}
            onChange={(event) => handleChange('y', event.target.value)}
            onBlur={() => handleBlur('y')}
          />
        </label>
      </div>

      <label className="field field--checkbox">
        <input
          type="checkbox"
          checked={aspect !== null}
          disabled={disabled}
          onChange={(event) =>
            onAspectChange(event.target.checked ? rect.width / rect.height : null)
          }
        />
        <span>
          Bloquear proporción
          {aspect ? ` (${formatAspect(aspect)})` : ''}
        </span>
      </label>

      <p className="panel__hint">
        {aspect
          ? 'La proporción actual se mantiene al escribir medidas y al arrastrar el recuadro.'
          : 'Actívalo para fijar la proporción actual: al cambiar una medida, la otra se ajusta sola.'}
      </p>

      <p className="panel__meta">
        Imagen: {imageWidth} × {imageHeight} px
      </p>

      <div className="panel__actions">
        <button
          type="button"
          className="secondary-button"
          disabled={disabled}
          onClick={handleReset}
        >
          Restablecer
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={disabled}
          onClick={handleSelectAll}
        >
          Seleccionar todo
        </button>
      </div>

      <button type="button" className="primary-button" disabled={disabled} onClick={onApply}>
        Aplicar recorte
      </button>
    </div>
  )
}
