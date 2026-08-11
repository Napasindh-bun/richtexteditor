export type TableAlignment = 'none' | 'left' | 'center' | 'right'

export type TablePropertiesValues = Readonly<{
  width: string
  height: string
  cellSpacing: string
  cellPadding: string
  borderWidth: string
  showCaption: boolean
  alignment: TableAlignment
  borderStyle: string
  borderColor: string
  backgroundColor: string
}>

export const DEFAULT_TABLE_PROPERTIES: TablePropertiesValues = {
  width: '100%',
  height: '',
  cellSpacing: '',
  cellPadding: '',
  borderWidth: '1',
  showCaption: false,
  alignment: 'none',
  borderStyle: 'solid',
  borderColor: '',
  backgroundColor: '',
}

export const TABLE_BORDER_STYLES = [
  'solid',
  'dotted',
  'dashed',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
  'none',
  'hidden',
] as const

/**
 * Browsers draw these styles as plain `solid` below a certain width, so picking
 * them at 1px looks like the setting was ignored. Raise the width to the point
 * where the style is actually distinguishable.
 */
const MIN_BORDER_WIDTH_PX: Record<string, number> = {
  double: 3,
  groove: 2,
  ridge: 2,
  inset: 2,
  outset: 2,
}

/** Border width to use for `style`, widened from `currentWidth` when needed. */
export function borderWidthForStyle(style: string, currentWidth: string): string {
  const minimum = MIN_BORDER_WIDTH_PX[style]
  if (!minimum) return currentWidth

  const parsed = Number.parseFloat(currentWidth)
  if (Number.isFinite(parsed) && parsed >= minimum) return currentWidth
  return String(minimum)
}
