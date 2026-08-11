import type { Editor } from '@tiptap/react'
import type { Mark, Node as ProseMirrorNode } from '@tiptap/pm/model'

export type TextCase = 'lowercase' | 'uppercase' | 'titlecase'

type TextSegment = {
  from: number
  to: number
  text: string
  marks: readonly Mark[]
}

const ALPHANUMERIC = /[\p{L}\p{N}]/u

function wordRangeAtCursor(editor: Editor): { from: number; to: number } | null {
  const { $from } = editor.state.selection
  if (!$from.parent.isTextblock) return null

  const blockFrom = $from.start()
  const blockTo = $from.end()
  const characters: Array<{ from: number; to: number; isWord: boolean }> = []

  editor.state.doc.nodesBetween(blockFrom, blockTo, (node, pos) => {
    if (!node.isText || !node.text) return
    let offset = 0
    for (const character of node.text) {
      const length = character.length
      characters.push({
        from: pos + offset,
        to: pos + offset + length,
        isWord: ALPHANUMERIC.test(character),
      })
      offset += length
    }
  })

  const cursor = $from.pos
  let index = characters.findIndex(
    (character) => character.isWord && character.from <= cursor && cursor < character.to,
  )
  if (index < 0) {
    index = characters.findIndex(
      (character) => character.isWord && character.to === cursor,
    )
  }
  if (index < 0) return null

  let start = index
  let end = index
  while (
    start > 0 &&
    characters[start - 1].isWord &&
    characters[start - 1].to === characters[start].from
  ) {
    start -= 1
  }
  while (
    end + 1 < characters.length &&
    characters[end + 1].isWord &&
    characters[end].to === characters[end + 1].from
  ) {
    end += 1
  }

  return { from: characters[start].from, to: characters[end].to }
}

function collectTextSegments(
  doc: ProseMirrorNode,
  from: number,
  to: number,
): TextSegment[] {
  const segments: TextSegment[] = []
  doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isText || !node.text) return
    const start = Math.max(pos, from)
    const end = Math.min(pos + node.nodeSize, to)
    if (start >= end) return
    segments.push({
      from: start,
      to: end,
      text: node.text.slice(start - pos, end - pos),
      marks: node.marks,
    })
  })
  return segments
}

/** Changes selected text (or the word at the caret) in one undoable transaction. */
export function applyTextCase(editor: Editor, mode: TextCase): boolean {
  const { state } = editor
  const selectedRange = state.selection.empty
    ? wordRangeAtCursor(editor)
    : { from: state.selection.from, to: state.selection.to }
  if (!selectedRange) return false

  const segments = collectTextSegments(state.doc, selectedRange.from, selectedRange.to)
  if (segments.length === 0) return false

  let beginsWord = true
  let previousTo = segments[0].from
  const replacements = segments.map((segment) => {
    // A block boundary or an inline atom between text segments breaks a word.
    if (segment.from > previousTo) beginsWord = true
    let text = ''
    for (const character of segment.text) {
      if (mode === 'lowercase') {
        text += character.toLocaleLowerCase()
      } else if (mode === 'uppercase') {
        text += character.toLocaleUpperCase()
      } else if (ALPHANUMERIC.test(character)) {
        text += beginsWord ? character.toLocaleUpperCase() : character.toLocaleLowerCase()
        beginsWord = false
      } else {
        text += character
        beginsWord = true
      }
    }
    previousTo = segment.to
    return { ...segment, text }
  })

  const transaction = state.tr
  let changed = false
  for (const segment of replacements.reverse()) {
    const original = state.doc.textBetween(segment.from, segment.to)
    if (segment.text === original) continue
    transaction.replaceWith(
      segment.from,
      segment.to,
      state.schema.text(segment.text, segment.marks),
    )
    changed = true
  }
  if (!changed) return false

  editor.view.dispatch(transaction.scrollIntoView())
  editor.view.focus()
  return true
}
