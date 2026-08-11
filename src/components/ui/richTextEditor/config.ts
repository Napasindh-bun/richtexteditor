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

export type ToolbarGroup = readonly ToolbarItemId[]

export type ResolvedEditorConfig = Readonly<{
  plugins: ReadonlySet<PluginId>
  toolbar: readonly ToolbarGroup[]
}>

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

/** Matches the current full toolbar layout (groups separated by dividers). */
export const DEFAULT_TOOLBAR: readonly ToolbarGroup[] = [
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

export function hasPlugin(plugins: ReadonlySet<PluginId>, id: PluginId): boolean {
  return plugins.has(id)
}

export function isToolbarItemAllowed(
  item: ToolbarItemId,
  plugins: ReadonlySet<PluginId>,
): boolean {
  const required = PLUGIN_FOR_TOOLBAR_ITEM[item]
  return required === null || plugins.has(required)
}

/**
 * Resolve host `plugins` / `toolbar` against defaults.
 * Toolbar items whose required plugin is off are dropped (TinyMCE behavior).
 */
export function resolveEditorConfig(input?: {
  plugins?: readonly PluginId[]
  toolbar?: readonly ToolbarGroup[]
}): ResolvedEditorConfig {
  const plugins = new Set<PluginId>(input?.plugins ?? DEFAULT_PLUGINS)
  const rawToolbar = input?.toolbar ?? DEFAULT_TOOLBAR
  const toolbar = rawToolbar
    .map((group) => group.filter((item) => isToolbarItemAllowed(item, plugins)))
    .filter((group) => group.length > 0)

  return { plugins, toolbar }
}
