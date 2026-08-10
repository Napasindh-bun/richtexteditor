import { common, createLowlight } from 'lowlight'

export const codeLowlight = createLowlight(common)

type HastNode = Readonly<{
  type: string
  value?: string
  tagName?: string
  properties?: Readonly<Record<string, unknown>>
  children?: readonly HastNode[]
}>

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function renderHast(node: HastNode): string {
  if (node.type === 'text') return escapeHtml(node.value ?? '')
  if (node.type !== 'element' || node.tagName !== 'span') {
    return (node.children ?? []).map(renderHast).join('')
  }
  const classNames = node.properties?.className
  const classes = Array.isArray(classNames)
    ? classNames.filter((value): value is string => typeof value === 'string')
    : []
  return `<span${classes.length ? ` class="${classes.join(' ')}"` : ''}>${(node.children ?? []).map(renderHast).join('')}</span>`
}

/** Expand lowlight decorations into HTML for read-only preview surfaces. */
export function htmlWithHighlightedCode(html: string): string {
  if (!html.trim() || typeof document === 'undefined') return html
  const root = document.createElement('div')
  root.innerHTML = html

  root.querySelectorAll<HTMLElement>('pre code').forEach((code) => {
    const languageClass = [...code.classList].find((name) => name.startsWith('language-'))
    const language = languageClass?.slice('language-'.length) || 'plaintext'
    if (language === 'plaintext') {
      code.classList.add('hljs')
      return
    }
    const result =
      codeLowlight.registered(language)
        ? codeLowlight.highlight(language, code.textContent ?? '')
        : codeLowlight.highlightAuto(code.textContent ?? '')
    code.innerHTML = result.children.map((node) => renderHast(node as HastNode)).join('')
    code.classList.add('hljs')
  })

  return root.innerHTML
}
