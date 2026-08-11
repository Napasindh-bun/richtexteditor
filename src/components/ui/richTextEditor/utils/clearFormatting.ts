import type { Editor } from '@tiptap/react'

export function clearFormatting(editor: Editor) {
  editor.chain().focus().unsetAllMarks().clearNodes().run()
}
