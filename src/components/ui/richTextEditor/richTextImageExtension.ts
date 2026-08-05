import Image from '@tiptap/extension-image'
import { ReactNodeViewRenderer } from '@tiptap/react'

import { ResizableImageNodeView } from './ResizableImageNodeView'

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
        default: 100,
        parseHTML: (element) => {
          const rawWidth = element.style.width || element.getAttribute('width') || '100'
          const parsedWidth = Number.parseInt(rawWidth, 10)
          return Number.isFinite(parsedWidth) ? Math.min(100, Math.max(20, parsedWidth)) : 100
        },
        renderHTML: (attributes) => {
          const parsedWidth =
            typeof attributes.width === 'number'
              ? attributes.width
              : Number.parseInt(String(attributes.width), 10)
          if (!Number.isFinite(parsedWidth)) {
            return {}
          }

          const width = Math.min(100, Math.max(20, parsedWidth))
          return {
            width: `${width}%`,
            style: `width: ${width}%; height: auto;`,
          }
        },
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageNodeView)
  },
})
