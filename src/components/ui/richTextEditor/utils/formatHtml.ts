/** Tags that get their own line and indent whatever they wrap. */
const CONTAINER_TAGS = new Set([
  'div',
  'ul',
  'ol',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'td',
  'th',
  'colgroup',
  'blockquote',
  'figure',
])

/** Tags that get their own line but keep their inline content on that line. */
const LEAF_BLOCK_TAGS = new Set([
  'p',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'pre',
  'hr',
  'col',
  'figcaption',
  'video',
  'audio',
  'iframe',
])

const VOID_TAGS = new Set(['br', 'hr', 'img', 'col', 'input', 'source'])

function readTagName(token: string): string {
  return /^<\/?\s*([a-zA-Z0-9-]+)/.exec(token)?.[1]?.toLowerCase() ?? ''
}

/**
 * Lay out `getHTML()` output so it can be read and edited in the source dialog.
 * Purely cosmetic — TipTap re-parses the result, so the whitespace this adds is
 * discarded on save. Content inside `<pre>` is passed through untouched because
 * there whitespace is part of the text.
 */
export function formatHtml(html: string): string {
  const tokens = html.match(/<[^>]*>|[^<]+/g)
  if (!tokens) return html

  const lines: string[] = []
  let line = ''
  let depth = 0
  /** >0 while inside a leaf block, whose content must stay on one line. */
  let leafDepth = 0
  let inPre = false

  const indent = () => '  '.repeat(Math.max(0, depth))
  const flush = () => {
    if (line.trim()) lines.push(indent() + line.trim())
    line = ''
  }

  for (const token of tokens) {
    if (inPre) {
      line += token
      if (token.startsWith('</') && readTagName(token) === 'pre') {
        inPre = false
        leafDepth = 0
        lines.push(indent() + line)
        line = ''
      }
      continue
    }

    const isTag = token.startsWith('<')
    const name = isTag ? readTagName(token) : ''
    const isClosing = token.startsWith('</')
    const isVoid = VOID_TAGS.has(name) || token.endsWith('/>')

    if (leafDepth > 0) {
      line += token
      if (isTag && LEAF_BLOCK_TAGS.has(name) && !isVoid) {
        leafDepth += isClosing ? -1 : 1
        if (leafDepth === 0) flush()
      }
      continue
    }

    if (!isTag || (!CONTAINER_TAGS.has(name) && !LEAF_BLOCK_TAGS.has(name))) {
      line += token
      continue
    }

    if (CONTAINER_TAGS.has(name)) {
      flush()
      if (isClosing) {
        depth -= 1
        lines.push(indent() + token)
      } else {
        lines.push(indent() + token)
        if (!isVoid) depth += 1
      }
      continue
    }

    // Leaf block: opens a single line that runs until its closing tag.
    flush()
    line = token
    if (isVoid) {
      flush()
    } else if (name === 'pre') {
      inPre = true
    } else {
      leafDepth = 1
    }
  }

  flush()
  return lines.join('\n')
}
