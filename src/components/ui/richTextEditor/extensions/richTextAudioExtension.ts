import { mergeAttributes, Node } from '@tiptap/core'
import { NodeSelection, Plugin, TextSelection } from '@tiptap/pm/state'
import { ReactNodeViewRenderer } from '@tiptap/react'

import { ResizableAudioNodeView } from './ResizableAudioNodeView'

export const MIN_AUDIO_WIDTH_PX = 180

/** Preserve legacy percentages, while normalising bare numeric widths to px. */
export function normalizeAudioWidth(raw: unknown): string | null {
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
  if (percent) return Number(percent[1]) > 0 ? value : null
  return value
}

export function toAudioWidthPx(pixels: number, maxPixels: number): string {
  const upperBound = Math.max(maxPixels, MIN_AUDIO_WIDTH_PX)
  const clamped = Math.min(Math.max(pixels, MIN_AUDIO_WIDTH_PX), upperBound)
  return `${Math.round(clamped)}px`
}

export function parseAudioAlign(align: unknown): 'left' | 'center' | 'right' {
  return align === 'center' || align === 'right' ? align : 'left'
}

/** An audio player that remains playable in serialized HTML and previews. */
export const RichTextAudio = Node.create({
  name: 'audio',
  group: 'inline',
  inline: true,
  atom: true,
  // Moving the node is restricted to the dedicated grip in the node view so
  // dragging the native seek bar never moves the whole player.
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute('src'),
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute('title'),
      },
      align: {
        default: 'left',
        parseHTML: (element) => parseAudioAlign(element.getAttribute('data-align')),
        renderHTML: (attributes: { align?: unknown }) => ({
          'data-align': parseAudioAlign(attributes.align),
        }),
      },
      width: {
        default: null as string | null,
        parseHTML: (element) =>
          normalizeAudioWidth(element.style.width || element.getAttribute('width')),
        renderHTML: (attributes: { width?: string | null }) => {
          const width = normalizeAudioWidth(attributes.width)
          if (!width) return {}
          return {
            width: width.endsWith('px') ? width.slice(0, -2) : width,
            style: `width: ${width}`,
          }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'audio[src]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['audio', mergeAttributes(HTMLAttributes, { controls: 'true', preload: 'metadata' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableAudioNodeView, {
      trackNodeViewPosition: true,
      stopEvent: ({ event }) => {
        if (event.type === 'dragstart') {
          const target = event.target
          const startedFromGrip =
            target instanceof Element && Boolean(target.closest('[data-drag-handle]'))

          // The outer ProseMirror node is draggable, but native audio controls
          // must retain their own pointer-drag behaviour (seek and volume).
          if (!startedFromGrip) {
            event.preventDefault()
            return true
          }

          // ProseMirror must receive drags from the grip so it can move the node.
          return false
        }
        if (event.type.startsWith('drag') || event.type === 'drop') return false
        // Native controls live in a browser shadow tree and event.target differs
        // between engines. Ignore every other event from this atom at
        // ProseMirror level; controls and React resize handles continue
        // receiving normal DOM events.
        return true
      },
    })
  },

  addProseMirrorPlugins() {
    const audioType = this.type

    return [
      new Plugin({
        props: {
          handleTextInput: (view, _from, _to, text) => {
            const { selection } = view.state
            if (!(selection instanceof NodeSelection) || selection.node.type !== audioType) {
              return false
            }

            const insertPos = selection.to
            let tr = view.state.tr.insertText(text, insertPos)
            tr = tr.setSelection(TextSelection.create(tr.doc, insertPos + text.length))
            view.dispatch(tr.scrollIntoView())
            return true
          },
        },
      }),
    ]
  },
})
