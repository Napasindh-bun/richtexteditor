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
