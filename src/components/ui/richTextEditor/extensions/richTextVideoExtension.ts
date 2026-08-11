import { mergeAttributes, Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'

import { ResizableVideoNodeView } from '../nodeViews/ResizableVideoNodeView'

export type VideoProvider = 'file' | 'youtube'

export type VideoSource = Readonly<{
  provider: VideoProvider
  src: string
}>

const YOUTUBE_ID_PATTERNS = [
  /(?:youtube\.com|youtube-nocookie\.com)\/watch\?(?:.*&)?v=([\w-]{6,})/i,
  /youtu\.be\/([\w-]{6,})/i,
  /(?:youtube\.com|youtube-nocookie\.com)\/embed\/([\w-]{6,})/i,
  /(?:youtube\.com|youtube-nocookie\.com)\/shorts\/([\w-]{6,})/i,
]

/** YouTube video id, or null when the URL is not a YouTube link. */
export function parseYouTubeId(url: string): string | null {
  const trimmed = url.trim()
  for (const pattern of YOUTUBE_ID_PATTERNS) {
    const id = pattern.exec(trimmed)?.[1]
    if (id) return id
  }
  return null
}

/** Normalize a pasted URL into the node attributes to insert. */
export function parseVideoSource(url: string): VideoSource | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  const youTubeId = parseYouTubeId(trimmed)
  if (youTubeId) {
    return { provider: 'youtube', src: `https://www.youtube.com/embed/${youTubeId}` }
  }
  return { provider: 'file', src: trimmed }
}

export const MIN_VIDEO_WIDTH_PERCENT = 20
export const MAX_VIDEO_WIDTH_PERCENT = 100

export function clampVideoWidthPercent(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return MAX_VIDEO_WIDTH_PERCENT
  return Math.min(
    MAX_VIDEO_WIDTH_PERCENT,
    Math.max(MIN_VIDEO_WIDTH_PERCENT, Math.round(parsed)),
  )
}

export function parseVideoAlign(align: unknown): 'left' | 'center' | 'right' {
  return align === 'center' || align === 'right' ? align : 'left'
}

/**
 * One node for both uploaded files and YouTube embeds. It renders straight to
 * `<video>` / `<iframe>` so read-only surfaces (RichTextHtmlPreview) show the
 * media without any extra transform step, and both tags parse back in.
 */
export const RichTextVideo = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute('src'),
      },
      provider: {
        default: 'file' as VideoProvider,
        parseHTML: (element) =>
          element.tagName.toLowerCase() === 'iframe' ? 'youtube' : 'file',
        renderHTML: (attributes) => ({
          'data-video-provider': attributes.provider === 'youtube' ? 'youtube' : 'file',
        }),
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute('title'),
      },
      align: {
        default: 'left',
        parseHTML: (element) => parseVideoAlign(element.getAttribute('data-align')),
        renderHTML: (attributes) => ({ 'data-align': parseVideoAlign(attributes.align) }),
      },
      width: {
        default: MAX_VIDEO_WIDTH_PERCENT,
        parseHTML: (element) =>
          clampVideoWidthPercent(element.style.width || element.getAttribute('width')),
        renderHTML: (attributes) => ({
          style: `width: ${clampVideoWidthPercent(attributes.width)}%`,
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'video[src]' }, { tag: 'iframe[src]' }]
  },

  renderHTML({ HTMLAttributes, node }) {
    if (node.attrs.provider === 'youtube') {
      return [
        'iframe',
        mergeAttributes(HTMLAttributes, {
          frameborder: '0',
          allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
          allowfullscreen: 'true',
          style: 'aspect-ratio: 16 / 9; height: auto',
        }),
      ]
    }

    return [
      'video',
      mergeAttributes(HTMLAttributes, { controls: 'true', style: 'height: auto' }),
    ]
  },

  addNodeView() {
    // Keeps the cached node view position fresh so a video whose position
    // shifts does not mis-report itself as selected.
    return ReactNodeViewRenderer(ResizableVideoNodeView, { trackNodeViewPosition: true })
  },
})
