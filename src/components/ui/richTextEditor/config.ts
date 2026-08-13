/**
 * TinyMCE-style editor configuration: `plugins` enable capabilities (schema /
 * extensions), `toolbar` chooses which buttons to show and in what order.
 */

export type PluginId =
  | 'link'
  | 'image'
  | 'video'
  | 'audio'
  | 'table'
  | 'lists'
  | 'math'
  | 'science'
  | 'codeSample'
  | 'textStyle'
  | 'align'
  | 'indent'
  | 'formatPainter'

export type ToolbarItemId =
  | 'undo'
  | 'redo'
  | 'fontSize'
  | 'lineHeight'
  | 'bold'
  | 'italic'
  | 'textDecoration'
  | 'textColor'
  | 'highlight'
  | 'textCase'
  | 'formatPainter'
  | 'clearFormatting'
  | 'indentDecrease'
  | 'indentIncrease'
  | 'bulletList'
  | 'orderedList'
  | 'taskList'
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight'
  | 'link'
  | 'image'
  | 'video'
  | 'audio'
  | 'table'
  | 'math'
  | 'science'
  | 'codeSample'
  | 'preview'
  | 'sourceCode'
  | 'fullscreen'

/** Built-in item or a host-registered custom button id (TinyMCE toolbar strings). */
export type ToolbarSlotId = ToolbarItemId | (string & {})

export type ToolbarGroup = readonly ToolbarSlotId[]

export type ToolbarTemplateId = 'default' | 'full' | 'custom'

export type ResolvedEditorConfig = Readonly<{
  plugins: ReadonlySet<PluginId>
  toolbar: readonly ToolbarGroup[]
}>

export const TOOLBAR_ITEM_LABELS: Readonly<Record<ToolbarItemId, string>> = {
  undo: 'Undo',
  redo: 'Redo',
  fontSize: 'Font size',
  lineHeight: 'Line height',
  bold: 'Bold',
  italic: 'Italic',
  textDecoration: 'Text decoration',
  textColor: 'Text color',
  highlight: 'Highlight',
  textCase: 'Text case',
  formatPainter: 'Format painter',
  clearFormatting: 'Clear formatting',
  indentDecrease: 'Decrease indent',
  indentIncrease: 'Increase indent',
  bulletList: 'Bullet list',
  orderedList: 'Numbered list',
  taskList: 'Task list',
  alignLeft: 'Align left',
  alignCenter: 'Align center',
  alignRight: 'Align right',
  link: 'Link',
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  table: 'Table',
  math: 'Math',
  science: 'Science',
  codeSample: 'Code sample',
  preview: 'Preview',
  sourceCode: 'Source code',
  fullscreen: 'Fullscreen',
}

/** Plugin required for a toolbar item, or `null` when always available (core). */
export const PLUGIN_FOR_TOOLBAR_ITEM: Readonly<Record<ToolbarItemId, PluginId | null>> = {
  undo: null,
  redo: null,
  bold: null,
  italic: null,
  clearFormatting: null,
  preview: null,
  sourceCode: null,
  fullscreen: null,
  fontSize: 'textStyle',
  lineHeight: 'textStyle',
  textDecoration: 'textStyle',
  textColor: 'textStyle',
  highlight: 'textStyle',
  textCase: 'textStyle',
  formatPainter: 'formatPainter',
  indentDecrease: 'indent',
  indentIncrease: 'indent',
  bulletList: 'lists',
  orderedList: 'lists',
  taskList: 'lists',
  alignLeft: 'align',
  alignCenter: 'align',
  alignRight: 'align',
  link: 'link',
  image: 'image',
  video: 'video',
  audio: 'audio',
  table: 'table',
  math: 'math',
  science: 'science',
  codeSample: 'codeSample',
}

export const DEFAULT_PLUGINS: readonly PluginId[] = [
  'link',
  'image',
  'video',
  'audio',
  'table',
  'lists',
  'math',
  'science',
  'codeSample',
  'textStyle',
  'align',
  'indent',
  'formatPainter',
] as const

/** Everyday writing set (Default template). */
export const DEFAULT_TOOLBAR: readonly ToolbarGroup[] = [
  ['undo', 'redo'],
  ['fontSize'],
  ['bold', 'italic', 'textDecoration', 'textColor', 'highlight'],
  ['indentDecrease', 'indentIncrease', 'bulletList', 'orderedList'],
  ['alignLeft', 'alignCenter', 'alignRight'],
  ['link', 'image', 'table'],
  ['preview', 'fullscreen'],
] as const

/** Every toolbar button, grouped like the previous full layout. */
export const FULL_TOOLBAR: readonly ToolbarGroup[] = [
  ['undo', 'redo'],
  ['fontSize', 'lineHeight'],
  [
    'bold',
    'italic',
    'textDecoration',
    'textColor',
    'textCase',
    'formatPainter',
    'clearFormatting',
    'highlight',
  ],
  ['indentDecrease', 'indentIncrease', 'bulletList', 'orderedList', 'taskList'],
  ['alignLeft', 'alignCenter', 'alignRight'],
  ['table', 'image', 'video', 'audio', 'link', 'math', 'science', 'codeSample'],
  ['preview', 'sourceCode', 'fullscreen'],
] as const

export function toolbarFromTemplate(
  template: ToolbarTemplateId,
  custom?: readonly ToolbarGroup[],
): readonly ToolbarGroup[] {
  if (template === 'full') return FULL_TOOLBAR
  if (template === 'custom' && custom && custom.length > 0) return custom
  return DEFAULT_TOOLBAR
}

export function hasPlugin(plugins: ReadonlySet<PluginId>, id: PluginId): boolean {
  return plugins.has(id)
}

export function isBuiltinToolbarItem(item: string): item is ToolbarItemId {
  return Object.prototype.hasOwnProperty.call(PLUGIN_FOR_TOOLBAR_ITEM, item)
}

export function isToolbarItemAllowed(
  item: string,
  plugins: ReadonlySet<PluginId>,
): boolean {
  if (!isBuiltinToolbarItem(item)) return false
  const required = PLUGIN_FOR_TOOLBAR_ITEM[item]
  return required === null || plugins.has(required)
}

export function isToolbarSlotAllowed(
  item: string,
  plugins: ReadonlySet<PluginId>,
  customButtonIds: ReadonlySet<string> = new Set(),
): boolean {
  if (isBuiltinToolbarItem(item)) return isToolbarItemAllowed(item, plugins)
  return customButtonIds.has(item)
}

/**
 * Resolve host `plugins` / `toolbar` against defaults.
 * Built-in items whose required plugin is off are dropped (TinyMCE behavior).
 * Unknown custom ids are kept only when registered in `customButtonIds`.
 */
export function resolveEditorConfig(input?: {
  plugins?: readonly PluginId[]
  toolbar?: readonly ToolbarGroup[]
  customButtonIds?: ReadonlySet<string>
}): ResolvedEditorConfig {
  const plugins = new Set<PluginId>(input?.plugins ?? DEFAULT_PLUGINS)
  const rawToolbar = input?.toolbar ?? DEFAULT_TOOLBAR
  const customButtonIds = input?.customButtonIds ?? new Set<string>()
  const toolbar = rawToolbar
    .map((group) => group.filter((item) => isToolbarSlotAllowed(item, plugins, customButtonIds)))
    .filter((group) => group.length > 0)

  return { plugins, toolbar }
}
