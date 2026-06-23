export type ExportFormat = 'image/png' | 'image/jpeg' | 'image/webp'

export type Tool = 'crop' | 'resize' | 'background' | 'export'

export interface ImageRect {
  x: number
  y: number
  width: number
  height: number
}

export interface ImageDimensions {
  width: number
  height: number
}
