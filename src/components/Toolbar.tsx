import type { Tool } from '../lib/types'

interface ToolbarProps {
  activeTool: Tool
  disabled: boolean
  onSelect: (tool: Tool) => void
}

const TOOLS: { id: Tool; label: string; description: string }[] = [
  { id: 'crop', label: 'Recortar', description: 'Selecciona el área a conservar' },
  { id: 'resize', label: 'Redimensionar', description: 'Cambia ancho y alto libremente' },
  { id: 'background', label: 'Quitar fondo', description: 'Elimina el fondo con IA local' },
  { id: 'export', label: 'Exportar', description: 'Descarga en PNG, JPEG o WebP' },
]

export function Toolbar({ activeTool, disabled, onSelect }: ToolbarProps) {
  return (
    <div className="toolbar" role="tablist" aria-label="Herramientas del editor">
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          type="button"
          role="tab"
          aria-selected={activeTool === tool.id}
          className={`toolbar__button${activeTool === tool.id ? ' toolbar__button--active' : ''}`}
          disabled={disabled}
          onClick={() => onSelect(tool.id)}
        >
          <span className="toolbar__label">{tool.label}</span>
          <span className="toolbar__description">{tool.description}</span>
        </button>
      ))}
    </div>
  )
}
