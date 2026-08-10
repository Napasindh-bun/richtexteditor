'use client'

import { useMemo } from 'react'

import { cn } from '@libs'
import { htmlWithRenderedMath } from '@utils/editor/richTextMath'

import { htmlWithHighlightedCode } from './codeSampleHighlight'
import contentStyles from './styles/RichTextContent.module.css'
import styles from './styles/RichTextHtmlPreview.module.css'

type RichTextHtmlPreviewProps = Readonly<{
  html: string
  fallback?: string
  className?: string
}>

/**
 * Renders stored rich-text HTML with KaTeX math expanded, for read-only previews
 * (e.g. essay question field in the left sidebar).
 */
export function RichTextHtmlPreview({
  html,
  fallback = '',
  className,
}: RichTextHtmlPreviewProps) {
  const trimmed = html.trim()
  const renderedHtml = useMemo(
    () => (trimmed ? htmlWithHighlightedCode(htmlWithRenderedMath(trimmed)) : ''),
    [trimmed],
  )

  if (!trimmed) {
    return (
      <div className={cn(styles.preview, styles.fallback, className)}>
        {fallback || 'โจทย์'}
      </div>
    )
  }

  return (
    <div
      className={cn(contentStyles.content, styles.preview, className)}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  )
}
