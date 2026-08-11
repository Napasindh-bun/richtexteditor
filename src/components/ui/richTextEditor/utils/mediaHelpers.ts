import type { Editor } from '@tiptap/react'

/** Media nodes carry their own `align` attribute instead of the TextAlign mark. */
export const MEDIA_NODE_TYPES = ['image', 'video', 'audio'] as const

export type MediaNodeType = (typeof MEDIA_NODE_TYPES)[number]

export function getActiveMediaType(editor: Editor): MediaNodeType | null {
  return MEDIA_NODE_TYPES.find((type) => editor.isActive(type)) ?? null
}

export function getMediaAlignment(editor: Editor): 'left' | 'center' | 'right' | null {
  const mediaType = getActiveMediaType(editor)
  if (!mediaType) return null

  const align = editor.getAttributes(mediaType).align
  return align === 'left' || align === 'center' || align === 'right' ? align : 'left'
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '')
    }
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image'))
    reader.readAsDataURL(file)
  })
}
