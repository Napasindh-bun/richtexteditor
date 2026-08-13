'use client'

import { useLayoutEffect, useRef, useState } from 'react'

import type { AnyExtension } from '@tiptap/core'

import { cn } from '@libs'
import { hasRichTextContent } from '@utils/editor/richText'

import { RichTextEditorModal } from './RichTextEditorModal'
import { RichTextHtmlPreview } from './RichTextHtmlPreview'
import type { PluginId, ToolbarGroup } from './config'
import type { CustomToolbarButtons, EditorSetup } from './customToolbar'
import styles from './styles/RichTextField.module.css'

type RichTextFieldProps = Readonly<{
  label: string
  /** HTML stored for this field. */
  value: string
  /** Empty-state text and preview fallback. */
  placeholder?: string
  /** Extra plain text counted as content (e.g. legacy questionText). */
  plainText?: string
  /** Dialog title when editing. */
  editorTitle: string
  isEditorOpen: boolean
  onOpenEditor: () => void
  onCloseEditor: () => void
  onSave: (html: string) => void
  className?: string
  labelClassName?: string
  previewClassName?: string
  /** Forwarded to RichTextEditor — see its `onUploadVideo` prop. */
  onUploadVideo?: (file: File) => Promise<string>
  /** Forwarded to RichTextEditor — see its `onUploadAudio` prop. */
  onUploadAudio?: (file: File) => Promise<string>
  plugins?: readonly PluginId[]
  toolbar?: readonly ToolbarGroup[]
  customToolbarButtons?: CustomToolbarButtons
  extensions?: readonly AnyExtension[]
  setup?: EditorSetup
}>

/**
 * Shared rich-text field: preview surface + modal editor.
 * Used by essay question / hint / guideline panels and similar authoring UIs.
 */
export function RichTextField({
  label,
  value,
  placeholder = '',
  plainText,
  editorTitle,
  isEditorOpen,
  onOpenEditor,
  onCloseEditor,
  onSave,
  className,
  labelClassName,
  previewClassName,
  onUploadVideo,
  onUploadAudio,
  plugins,
  toolbar,
  customToolbarButtons,
  extensions,
  setup,
}: RichTextFieldProps) {
  const emptyLabel = placeholder || label
  const hasContent = hasRichTextContent(value, plainText)
  const clipRef = useRef<HTMLDivElement>(null)
  const [isTruncated, setIsTruncated] = useState(false)

  useLayoutEffect(() => {
    const element = clipRef.current
    if (!element) {
      setIsTruncated(false)
      return
    }

    const updateTruncation = () => {
      setIsTruncated(element.scrollHeight > element.clientHeight + 1)
    }

    updateTruncation()

    const observer = new ResizeObserver(updateTruncation)
    observer.observe(element)
    return () => observer.disconnect()
  }, [value, plainText, hasContent])

  return (
    <div className={cn(styles.root, className)}>
      <h3 className={cn(styles.label, labelClassName)}>{label}</h3>
      <button
        type="button"
        className={cn(styles.preview, isTruncated && styles.previewTruncated, previewClassName)}
        onClick={onOpenEditor}
      >
        <div ref={clipRef} className={styles.previewClip}>
          {hasContent ? (
            <RichTextHtmlPreview html={value} fallback={plainText || emptyLabel} />
          ) : (
            emptyLabel
          )}
        </div>
        {isTruncated ? (
          <span className={styles.ellipsis} aria-hidden>
            ...
          </span>
        ) : null}
      </button>
      <RichTextEditorModal
        isOpen={isEditorOpen}
        title={editorTitle}
        value={value}
        onClose={onCloseEditor}
        onSave={onSave}
        onUploadVideo={onUploadVideo}
        onUploadAudio={onUploadAudio}
        plugins={plugins}
        toolbar={toolbar}
        customToolbarButtons={customToolbarButtons}
        extensions={extensions}
        setup={setup}
      />
    </div>
  )
}
