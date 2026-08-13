import { mergeAttributes, Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'

import { ChoiceDropdownNodeView } from './ChoiceDropdownNodeView'
import {
  CHOICE_DROPDOWN_TYPE,
  DEFAULT_DROPDOWN_OPTIONS,
  parseDropdownOptions,
  serializeDropdownOptions,
} from './dropdownOptions'

export { CHOICE_DROPDOWN_TYPE, DEFAULT_DROPDOWN_OPTIONS } from './dropdownOptions'

/** Playground-only inline dropdown. Not part of the published editor. */
export const ChoiceDropdown = Node.create({
  name: CHOICE_DROPDOWN_TYPE,
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      options: {
        default: [...DEFAULT_DROPDOWN_OPTIONS],
        parseHTML: (element) => parseDropdownOptions(element.getAttribute('data-options')),
        renderHTML: (attributes) => ({
          'data-options': serializeDropdownOptions(parseDropdownOptions(attributes.options)),
        }),
      },
      value: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-value') ?? '',
        renderHTML: (attributes) => ({ 'data-value': String(attributes.value ?? '') }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-choice-dropdown]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ 'data-choice-dropdown': 'true' }, HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChoiceDropdownNodeView, { as: 'span' })
  },
})
