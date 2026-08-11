import { Mark, mergeAttributes } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    doubleUnderline: {
      setDoubleUnderline: () => ReturnType
      toggleDoubleUnderline: () => ReturnType
      unsetDoubleUnderline: () => ReturnType
    }
  }
}

/**
 * Double underline mark (`text-decoration-style: double`).
 * Stored as `<span data-double-underline>` so it survives HTML round-trips.
 */
export const DoubleUnderline = Mark.create({
  name: 'doubleUnderline',

  parseHTML() {
    return [
      { tag: 'span[data-double-underline]' },
      {
        style: 'text-decoration-style',
        getAttrs: (value) => (value === 'double' ? {} : false),
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-double-underline': '',
        style: 'text-decoration-line: underline; text-decoration-style: double;',
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setDoubleUnderline:
        () =>
        ({ commands }) =>
          commands.setMark(this.name),
      toggleDoubleUnderline:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
      unsetDoubleUnderline:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-u': () => this.editor.commands.toggleDoubleUnderline(),
    }
  },
})
