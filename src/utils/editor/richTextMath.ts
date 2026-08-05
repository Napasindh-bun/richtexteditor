import katex from 'katex'
import 'katex/contrib/mhchem'

function readLatex(element: HTMLElement): string {
  return element.getAttribute('data-latex')?.trim() || element.dataset.latex?.trim() || ''
}

/**
 * Render Tiptap Mathematics nodes (`[data-latex]`) in-place with KaTeX so previews
 * show real formulas instead of empty spans or raw LaTeX source.
 */
export function renderMathInElement(container: HTMLElement) {
  container.querySelectorAll<HTMLElement>('[data-latex]').forEach((element) => {
    const latex = readLatex(element)
    if (!latex) return

    try {
      katex.render(latex, element, {
        throwOnError: false,
        displayMode: element.getAttribute('data-type') === 'block-math',
        output: 'html',
      })
    } catch {
      element.textContent = latex
    }
  })
}

/**
 * Return HTML with math nodes already expanded to KaTeX markup (safe for
 * `dangerouslySetInnerHTML` previews).
 */
export function htmlWithRenderedMath(html: string): string {
  if (!html.trim() || typeof document === 'undefined') return html

  const root = document.createElement('div')
  root.innerHTML = html

  root.querySelectorAll<HTMLElement>('[data-latex]').forEach((element) => {
    const latex = readLatex(element)
    if (!latex) {
      element.textContent = ''
      return
    }

    try {
      element.innerHTML = katex.renderToString(latex, {
        throwOnError: false,
        displayMode: element.getAttribute('data-type') === 'block-math',
        output: 'html',
      })
    } catch {
      element.textContent = latex
    }
  })

  return root.innerHTML
}

/** Pick the keyboard a formula was authored with — mhchem markers mean science. */
export function resolveMathVariant(latex: string): 'math' | 'science' {
  return /\\ce\s*\{/.test(latex) || /\\pu\s*\{/.test(latex) ? 'science' : 'math'
}

/** True when the HTML includes at least one math node. */
export function htmlHasMath(html: string): boolean {
  return /\bdata-latex\s*=/i.test(html)
}
