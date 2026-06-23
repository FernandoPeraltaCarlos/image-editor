import type { RemoveBackgroundProgress } from '../lib/removeBackground'

interface BackgroundPanelProps {
  disabled: boolean
  isProcessing: boolean
  progress: RemoveBackgroundProgress | null
  onRemove: () => void
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) {
    return '0 MB'
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function BackgroundPanel({
  disabled,
  isProcessing,
  progress,
  onRemove,
}: BackgroundPanelProps) {
  const percent = progress ? Math.round(progress.ratio * 100) : 0

  return (
    <div className="panel">
      <h2>Quitar fondo</h2>
      <p className="panel__hint">
        Usa un modelo de IA que se ejecuta localmente en tu navegador. La imagen no se envía a
        ningún servidor externo.
      </p>
      <p className="panel__hint">
        La primera vez puede tardar un poco mientras se cargan los modelos (~20 MB).
      </p>

      <button
        type="button"
        className="primary-button"
        disabled={disabled || isProcessing}
        onClick={onRemove}
      >
        {isProcessing ? 'Procesando…' : 'Eliminar fondo'}
      </button>

      {isProcessing ? (
        <div className="progress">
          <div className="progress__header">
            <span>
              {progress?.stage === 'processing' ? 'Procesando imagen…' : 'Descargando modelo…'}
            </span>
            <span>{percent}%</span>
          </div>
          <div className="progress__track">
            <div className="progress__bar" style={{ width: `${percent}%` }} />
          </div>
          {progress?.stage === 'download' && progress.total > 0 ? (
            <p className="progress__detail">
              {formatBytes(progress.current)} / {formatBytes(progress.total)}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
