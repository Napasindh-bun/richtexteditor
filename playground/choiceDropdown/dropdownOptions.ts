export const CHOICE_DROPDOWN_TYPE = 'choiceDropdown'

export const DEFAULT_DROPDOWN_OPTIONS = ['ตัวเลือก 1', 'ตัวเลือก 2', 'ตัวเลือก 3'] as const

export function parseDropdownOptions(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof raw !== 'string' || raw.trim() === '') return [...DEFAULT_DROPDOWN_OPTIONS]
  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const options = parsed.map((item) => String(item).trim()).filter(Boolean)
      return options.length > 0 ? options : [...DEFAULT_DROPDOWN_OPTIONS]
    }
  } catch {
    /* stored as pipe-separated */
  }
  const options = raw
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)
  return options.length > 0 ? options : [...DEFAULT_DROPDOWN_OPTIONS]
}

export function serializeDropdownOptions(options: readonly string[]): string {
  return JSON.stringify(options.map((item) => item.trim()).filter(Boolean))
}
