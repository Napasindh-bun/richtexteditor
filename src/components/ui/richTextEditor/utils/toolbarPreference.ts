import {
  DEFAULT_TOOLBAR,
  PLUGIN_FOR_TOOLBAR_ITEM,
  type ToolbarGroup,
  type ToolbarItemId,
  type ToolbarTemplateId,
} from '../config'

export const TOOLBAR_PREFERENCE_KEY = 'richtexteditor.toolbar.v1'

export type ToolbarPreference = Readonly<{
  template: ToolbarTemplateId
  custom: readonly ToolbarGroup[]
}>

const ITEM_IDS = new Set<string>(Object.keys(PLUGIN_FOR_TOOLBAR_ITEM))

const FALLBACK: ToolbarPreference = { template: 'default', custom: DEFAULT_TOOLBAR }

function isToolbarItemId(value: unknown): value is ToolbarItemId {
  return typeof value === 'string' && ITEM_IDS.has(value)
}

function isTemplateId(value: unknown): value is ToolbarTemplateId {
  return value === 'default' || value === 'full' || value === 'custom'
}

export function parseToolbarPreference(raw: string | null): ToolbarPreference {
  if (!raw) return FALLBACK
  try {
    const parsed = JSON.parse(raw) as { template?: unknown; custom?: unknown }
    const template = isTemplateId(parsed.template) ? parsed.template : 'default'
    const custom = Array.isArray(parsed.custom)
      ? parsed.custom
          .map((group) => (Array.isArray(group) ? group.filter(isToolbarItemId) : []))
          .filter((group) => group.length > 0)
      : []
    return { template, custom: custom.length > 0 ? custom : DEFAULT_TOOLBAR }
  } catch {
    return FALLBACK
  }
}

export function loadToolbarPreference(): ToolbarPreference {
  if (typeof window === 'undefined') return FALLBACK
  return parseToolbarPreference(window.localStorage.getItem(TOOLBAR_PREFERENCE_KEY))
}

export function saveToolbarPreference(preference: ToolbarPreference) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TOOLBAR_PREFERENCE_KEY, JSON.stringify(preference))
}
