import { mergeAttributes, Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'

import { AnswerBoxNodeView } from './AnswerBoxNodeView'

export const ANSWER_BOX_TYPE = 'answerBox'

/** Playground-only inline answer chip. Not part of the published editor. */
export const AnswerBox = Node.create({
  name: ANSWER_BOX_TYPE,
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      value: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-value') ?? '',
        renderHTML: (attributes) => ({ 'data-value': String(attributes.value ?? '') }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-answer-box]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ 'data-answer-box': 'true' }, HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(AnswerBoxNodeView, { as: 'span' })
  },
})
