import type { Editor } from '@tiptap/react'

const NODE_PATH_LABELS: Record<string, string> = {
  doc: 'document',
  paragraph: 'p',
  bulletList: 'ul',
  orderedList: 'ol',
  taskList: 'ul',
  taskItem: 'li',
  listItem: 'li',
  table: 'table',
  tableRow: 'tr',
  tableCell: 'td',
  tableHeader: 'th',
  image: 'img',
  video: 'video',
  audio: 'audio',
  codeBlock: 'pre',
  inlineMath: 'math',
  blockMath: 'math',
  hardBreak: 'br',
  text: 'text',
}

export function getElementPath(editor: Editor): string[] {
  const { $from } = editor.state.selection
  const path: string[] = []
  for (let depth = 1; depth <= $from.depth; depth += 1) {
    const name = $from.node(depth).type.name
    path.push(NODE_PATH_LABELS[name] ?? name)
  }
  if (editor.isActive('image')) path.push('img')
  if (editor.isActive('link')) path.push('a')
  if (editor.isActive('bold')) path.push('strong')
  if (editor.isActive('italic')) path.push('em')
  if (editor.isActive('underline') || editor.isActive('doubleUnderline')) path.push('u')
  if (editor.isActive('strike')) path.push('s')
  if (editor.isActive('superscript')) path.push('sup')
  if (editor.isActive('subscript')) path.push('sub')
  return path
}

export function getTextStats(editor: Editor): { words: number; chars: number } {
  const text = editor.state.doc.textContent.replace(/\s+/g, ' ').trim()
  if (!text) return { words: 0, chars: 0 }
  return { words: text.split(' ').length, chars: text.length }
}
