import Image from '@tiptap/extension-image'
import { NodeSelection, Plugin, TextSelection } from '@tiptap/pm/state'
import { ReactNodeViewRenderer } from '@tiptap/react'

import { ResizableImageNodeView } from './ResizableImageNodeView'

/** Smallest width a user can drag an image down to. */
export const MIN_IMAGE_WIDTH_PX = 24

/**
 * Normalise an author- or parser-supplied width into a unit-bearing CSS length,
 * or null for "no width — render at the image's intrinsic size".
 *
 *   null | '' | 'auto'    -> null
 *   '400' | '400px' | 400 -> '400px'
 *   '50%'                 -> '50%'   (legacy content, preserved verbatim)
 *   '20em' | 'calc(…)'    -> unchanged, never destroy authored CSS
 */
export function normalizeImageWidth(raw: unknown): string | null {
  const value =
    typeof raw === 'number' && Number.isFinite(raw)
      ? `${raw}px`
      : typeof raw === 'string'
        ? raw.trim()
        : ''
  if (!value || value === 'auto') return null

  const bare = /^(\d+(?:\.\d+)?)(px)?$/i.exec(value)
  if (bare) {
    const pixels = Math.round(Number(bare[1]))
    return pixels > 0 ? `${pixels}px` : null
  }

  const percent = /^(\d+(?:\.\d+)?)%$/.exec(value)
  if (percent) {
    return Number(percent[1]) > 0 ? value : null
  }

  return value
}

/** Clamp a measured pixel width into the allowed range and format it for the attribute. */
export function toImageWidthPx(pixels: number, maxPixels: number): string {
  const upperBound = Math.max(maxPixels, MIN_IMAGE_WIDTH_PX)
  const clamped = Math.min(Math.max(pixels, MIN_IMAGE_WIDTH_PX), upperBound)
  return `${Math.round(clamped)}px`
}

export const RichTextImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: 'left',
        parseHTML: (element) => element.dataset.align || 'left',
        renderHTML: (attributes) => {
          const align = attributes.align
          if (align !== 'left' && align !== 'center' && align !== 'right') {
            return {}
          }
          return { 'data-align': align }
        },
      },
      width: {
        default: null as string | null,
        parseHTML: (element) =>
          normalizeImageWidth(element.style.width || element.getAttribute('width')),
        renderHTML: (attributes: { width?: string | null }) => {
          const width = normalizeImageWidth(attributes.width)
          if (!width) return {}

          return {
            // TinyMCE writes a bare number in the presentational attribute for px.
            width: width.endsWith('px') ? width.slice(0, -2) : width,
            style: `width: ${width}; height: auto;`,
          }
        },
      },
      // Aspect ratio is locked: height always derives from width. A pasted
      // `height` attribute would round-trip and fight the `height: auto` above.
      height: {
        default: null,
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
    }
  },

  addNodeView() {
    // Without position tracking a sibling node view keeps a stale cached pos and
    // two adjacent images can both report themselves as selected.
    return ReactNodeViewRenderer(ResizableImageNodeView, { trackNodeViewPosition: true })
  },

  addProseMirrorPlugins() {
    const imageType = this.type

    return [
      new Plugin({
        props: {
          handleTextInput: (view, _from, _to, text) => {
            const { selection, schema } = view.state
            if (!(selection instanceof NodeSelection) || selection.node.type !== imageType) {
              return false
            }

            const paragraphType = schema.nodes.paragraph
            if (!paragraphType) return false

            const insertPos = selection.to
            if (imageType.isInline) {
              let tr = view.state.tr.insertText(text, insertPos)
              tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + text.length))
              view.dispatch(tr.scrollIntoView())
              return true
            }

            const nodeAfter = view.state.doc.nodeAt(insertPos)
            let tr = view.state.tr
            let cursorPos: number

            if (nodeAfter?.isTextblock) {
              // StarterKit normally supplies a trailing paragraph after a block
              // image. Type into it instead of replacing the selected image.
              cursorPos = insertPos + 1
              tr = tr.insertText(text, cursorPos)
            } else {
              // Imported HTML may end directly with an image. Create the text
              // block TinyMCE users expect to be able to continue into.
              const paragraph = paragraphType.create(
                null,
                text ? schema.text(text) : undefined,
              )
              tr = tr.insert(insertPos, paragraph)
              cursorPos = insertPos + 1
            }

            tr = tr.setSelection(TextSelection.create(tr.doc, cursorPos + text.length))
            view.dispatch(tr.scrollIntoView())
            return true
          },
        },
      }),
    ]
  },
})
