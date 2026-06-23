import type { HistoryEntry } from '../lib/types'

interface HistoryPanelProps {
  entries: HistoryEntry[]
  currentIndex: number
  disabled: boolean
  onSelect: (index: number) => void
  onRestoreOriginal: () => void
}

export function HistoryPanel({
  entries,
  currentIndex,
  disabled,
  onSelect,
  onRestoreOriginal,
}: HistoryPanelProps) {
  if (entries.length <= 1) {
    return null
  }

  const canRestoreOriginal = currentIndex > 0

  return (
    <div className="history-panel">
      <div className="history-panel__header">
        <h2>Historial</h2>
        <button
          type="button"
          className="link-button"
          disabled={disabled || !canRestoreOriginal}
          onClick={onRestoreOriginal}
        >
          Restaurar original
        </button>
      </div>

      <p className="panel__hint">
        Selecciona un paso para volver a ese estado. Puedes revertir todos los cambios hasta la
        imagen original.
      </p>

      <ol className="history-list">
        {entries.map((entry, index) => {
          const isActive = index === currentIndex
          const isPast = index < currentIndex

          return (
            <li key={index}>
              <button
                type="button"
                className={`history-item${isActive ? ' history-item--active' : ''}${isPast ? ' history-item--past' : ''}`}
                disabled={disabled || isActive}
                onClick={() => onSelect(index)}
              >
                <span className="history-item__label">{entry.label}</span>
                <span className="history-item__meta">
                  {entry.width} × {entry.height} px
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
