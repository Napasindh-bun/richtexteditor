import { Extension, type Command } from '@tiptap/core'

/** One indent step, matching TinyMCE's default `indentation` of 40px. */
const INDENT_STEP_PX = 40

/**
 * Indent is first-line only (`text-indent`), so a wrapped line without Enter
 * stays at 0. There is no ceiling — only the floor at zero is enforced.
 */
function clampIndent(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? '0'), 10)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraphIndent: {
      increaseParagraphIndent: () => ReturnType
      decreaseParagraphIndent: () => ReturnType
    }
  }
}

function changeIndent(delta: number): Command {
  return ({ state, dispatch }) => {
    const { from, to, empty, $from } = state.selection
    let transaction = state.tr
    let changed = false

    const updateParagraph = (node: typeof $from.parent, pos: number) => {
      const current = clampIndent(node.attrs.indent)
      const next = clampIndent(current + delta)
      if (next === current) return
      transaction = transaction.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next })
      changed = true
    }

    if (empty) {
      for (let depth = $from.depth; depth > 0; depth -= 1) {
        const node = $from.node(depth)
        if (node.type.name !== 'paragraph') continue
        updateParagraph(node, $from.before(depth))
        break
      }
    } else {
      state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.type.name === 'paragraph') updateParagraph(node, pos)
      })
    }

    if (changed && dispatch) dispatch(transaction)
    return changed
  }
}

export const ParagraphIndent = Extension.create({
  name: 'paragraphIndent',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph'],
        attributes: {
          indent: {
            default: 0,
            keepOnSplit: false,
            parseHTML: (element) => {
              const explicit = element.getAttribute('data-indent')
              if (explicit) return clampIndent(explicit)
              const fromText = Number.parseFloat(element.style.textIndent)
              if (Number.isFinite(fromText) && fromText > 0) {
                return clampIndent(Math.round(fromText / INDENT_STEP_PX))
              }
              const fromMargin = Number.parseFloat(element.style.marginLeft)
              return Number.isFinite(fromMargin) ? clampIndent(Math.round(fromMargin / INDENT_STEP_PX)) : 0
            },
            renderHTML: (attributes) => {
              const indent = clampIndent(attributes.indent)
              return indent
                ? {
                    'data-indent': String(indent),
                    // First line only — wrapped lines (no Enter) stay at indent 0.
                    style: `text-indent: ${indent * INDENT_STEP_PX}px`,
                  }
                : {}
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      increaseParagraphIndent: () => changeIndent(1),
      decreaseParagraphIndent: () => changeIndent(-1),
    }
  },

  addKeyboardShortcuts() {
    const run = (direction: 'increase' | 'decrease') => {
      // Tables keep Tab for cell navigation; code samples keep Tab for spaces.
      if (this.editor.isActive('table') || this.editor.isActive('codeBlock')) return false

      const listType = this.editor.isActive('taskItem')
        ? 'taskItem'
        : this.editor.isActive('listItem')
          ? 'listItem'
          : null
      if (listType) {
        return direction === 'increase'
          ? this.editor.commands.sinkListItem(listType)
          : this.editor.commands.liftListItem(listType)
      }

      const applied =
        direction === 'increase'
          ? this.editor.commands.increaseParagraphIndent()
          : this.editor.commands.decreaseParagraphIndent()
      // Word keeps focus in the document even when indent is already 0.
      return applied || this.editor.isActive('paragraph')
    }

    return {
      Tab: () => run('increase'),
      'Shift-Tab': () => run('decrease'),
      'Mod-]': () => run('increase'),
      'Mod-[': () => run('decrease'),
    }
  },
})
