const BLOCK_BREAK_RE = /<\/(p|div|li|h[1-6]|tr)>/gi
const TAG_RE = /<[^>]+>/g
/** Tiptap Mathematics empty nodes: `<span data-type="inline-math" data-latex="...">`. */
const MATH_ELEMENT_RE =
  /<(span|div)([^>]*\bdata-latex\s*=\s*)(["'])([\s\S]*?)\3([^>]*)>(?:\s*<\/\1>)?/gi

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function decodeBasicHtmlEntities(value: string): string {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
}

/** Replace MathLive/Tiptap math nodes with their LaTeX so plain-text previews keep formulas. */
export function replaceMathElementsWithLatex(html: string): string {
  return html.replace(MATH_ELEMENT_RE, (_match, _tag, _before, _quote, latex: string) => {
    const decoded = decodeBasicHtmlEntities(latex).trim()
    return decoded ? ` ${decoded} ` : ''
  })
}

export function plainTextToHtml(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''

  return trimmed
    .split(/\r?\n/)
    .map((line) => `<p>${escapeHtml(line) || '<br />'}</p>`)
    .join('')
}

export function htmlToPlainText(html: string): string {
  if (!html.trim()) return ''

  // Prefer DOM so `data-latex` is read decoded (handles entities / complex attrs).
  if (typeof document !== 'undefined') {
    const root = document.createElement('div')
    root.innerHTML = html

    root.querySelectorAll('[data-latex]').forEach((element) => {
      const latex = (element as HTMLElement).dataset.latex?.trim() ?? ''
      element.replaceWith(document.createTextNode(latex ? ` ${latex} ` : ''))
    })
    root.querySelectorAll('br').forEach((element) => {
      element.replaceWith(document.createTextNode('\n'))
    })
    root.querySelectorAll('p, div, li, h1, h2, h3, h4, h5, h6, tr').forEach((element) => {
      element.append(document.createTextNode('\n'))
    })
    root.querySelectorAll('td').forEach((element) => {
      element.append(document.createTextNode(' '))
    })

    return (root.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim()
  }

  const withMath = replaceMathElementsWithLatex(html)
  const withBreaks = withMath
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(BLOCK_BREAK_RE, '\n')
    .replace(/<td[^>]*>/gi, ' ')

  return withBreaks.replace(TAG_RE, '').replace(/\n{3,}/g, '\n\n').trim()
}

export function getRichTextHtml(html: string | undefined, fallbackText: string | undefined): string {
  const nextHtml = html?.trim()
  if (nextHtml) return nextHtml

  return plainTextToHtml(fallbackText ?? '')
}

const LOOKS_LIKE_HTML_RE = /<[a-z][\s\S]*>/i

/**
 * Normalize a stored rich-text field that may be legacy plain text or HTML.
 * Used for essay `answerGuideline` which historically stored plain text.
 */
export function coerceToRichTextHtml(value: string | undefined): string {
  const trimmed = value?.trim()
  if (!trimmed) return ''
  if (LOOKS_LIKE_HTML_RE.test(trimmed)) return trimmed
  return plainTextToHtml(trimmed)
}

/**
 * True when a stored field already holds rich-text HTML (rather than legacy
 * plain text). Surfaces use this to pick a rich editor/preview over a plain input.
 */
export function isRichTextHtml(value: string | undefined): boolean {
  const trimmed = value?.trim()
  if (!trimmed) return false
  return LOOKS_LIKE_HTML_RE.test(trimmed)
}

/** Build a TipTap/KaTeX inline math node from LaTeX. */
export function createInlineMathHtml(latex: string): string {
  const trimmed = latex.trim()
  if (!trimmed) return ''
  return `<span data-type="inline-math" data-latex="${escapeHtml(trimmed)}"></span>`
}

/**
 * An answer as alternating plain-text runs and formulas:
 * `textRuns[0] formulas[0] textRuns[1] … formulas[n-1] textRuns[n]`.
 *
 * Keeping the text as runs is what lets a formula sit *between* characters
 * without turning the field into a rich-text editor: each run is its own plain
 * input. `textRuns.length === formulas.length + 1` always holds — use
 * `normalizeInlineMathParts` after any structural edit to restore it.
 */
export type InlineMathParts = Readonly<{
  textRuns: string[]
  formulas: string[]
}>

/** One piece of an answer, before it is normalized back into runs. */
export type InlineMathSegment =
  | { readonly type: 'text'; readonly value: string }
  | { readonly type: 'formula'; readonly latex: string }

export function inlineMathSegments({ textRuns, formulas }: InlineMathParts): InlineMathSegment[] {
  return textRuns.flatMap((value, index) => {
    const run = { type: 'text', value } as const
    const latex = formulas[index]
    return latex === undefined ? [run] : [run, { type: 'formula', latex } as const]
  })
}

/**
 * Rebuild runs from an arbitrary segment list: adjacent texts merge, adjacent
 * formulas get an empty run between them, and the list always starts and ends
 * with a run.
 */
export function normalizeInlineMathParts(segments: InlineMathSegment[]): InlineMathParts {
  const textRuns: string[] = []
  const formulas: string[] = []

  for (const segment of segments) {
    if (segment.type === 'text') {
      if (textRuns.length === formulas.length + 1) {
        textRuns[textRuns.length - 1] += segment.value
      } else {
        textRuns.push(segment.value)
      }
      continue
    }

    if (textRuns.length === formulas.length) textRuns.push('')
    formulas.push(segment.latex)
  }

  if (textRuns.length === formulas.length) textRuns.push('')
  return { textRuns, formulas }
}

/** The answer without its formulas — what plain-text surfaces fall back to. */
export function inlineMathPlainText({ textRuns }: InlineMathParts): string {
  return textRuns.join('')
}

/**
 * Compose display HTML for an answer.
 * Returns the plain text untouched when there is no formula, so surfaces that
 * can render plain text keep taking the cheap path.
 */
export function buildInlineMathHtml(parts: InlineMathParts): string {
  if (parts.formulas.length === 0) return inlineMathPlainText(parts)

  return inlineMathSegments(parts)
    .map((segment) =>
      // Keep the author-entered spacing exactly as typed so inline formulas can
      // sit between Thai/English characters without being padded apart.
      segment.type === 'text' ? escapeHtml(segment.value) : createInlineMathHtml(segment.latex),
    )
    .join('')
}

/**
 * Read an answer back out of stored HTML.
 * Only needed for values authored before formulas moved to their own field —
 * those always appended the math after the text.
 */
export function splitInlineMathParts(value: string | undefined): InlineMathParts {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return { textRuns: [''], formulas: [] }
  if (!LOOKS_LIKE_HTML_RE.test(trimmed)) return { textRuns: [trimmed], formulas: [] }

  const formulas: string[] = []
  let text: string

  if (typeof document !== 'undefined') {
    const root = document.createElement('div')
    root.innerHTML = trimmed
    root.querySelectorAll<HTMLElement>('[data-latex]').forEach((element) => {
      const latex = element.dataset.latex?.trim()
      if (latex) formulas.push(latex)
      element.remove()
    })
    text = htmlToPlainText(root.innerHTML)
  } else {
    for (const match of trimmed.matchAll(MATH_ELEMENT_RE)) {
      const latex = decodeBasicHtmlEntities(match[4] ?? '').trim()
      if (latex) formulas.push(latex)
    }
    text = htmlToPlainText(trimmed.replace(MATH_ELEMENT_RE, ''))
  }

  return normalizeInlineMathParts([
    { type: 'text', value: text },
    ...formulas.map((latex) => ({ type: 'formula', latex }) as const),
  ])
}

/** True when HTML/text has visible content, including math-only rich text. */
export function hasRichTextContent(html: string | undefined, fallbackText?: string): boolean {
  if (fallbackText?.trim()) return true
  if (!html?.trim()) return false
  if (/\bdata-latex\s*=/i.test(html)) return true
  return Boolean(htmlToPlainText(html))
}
