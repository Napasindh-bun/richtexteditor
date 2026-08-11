import { Extension } from '@tiptap/core'

type LineHeightOptions = {
  types: string[]
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    lineHeight: {
      setLineHeight: (value: string) => ReturnType
      unsetLineHeight: () => ReturnType
    }
  }
}

/** Stores paragraph line height as an inline style so it survives HTML round-trips. */
export const LineHeight = Extension.create<LineHeightOptions>({
  name: 'lineHeight',

  addOptions() {
    // Task items also carry the value so their checkbox can share the first
    // text line's line box when a custom height is selected.
    return { types: ['paragraph', 'taskItem'] }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) =>
              attributes.lineHeight
                ? { style: `line-height: ${String(attributes.lineHeight)}` }
                : {},
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setLineHeight:
        (value) =>
        ({ commands }) => {
          let updated = false
          for (const type of this.options.types) {
            if (commands.updateAttributes(type, { lineHeight: value })) updated = true
          }
          return updated
        },
      unsetLineHeight:
        () =>
        ({ commands }) => {
          let updated = false
          for (const type of this.options.types) {
            if (commands.resetAttributes(type, 'lineHeight')) updated = true
          }
          return updated
        },
    }
  },
})
