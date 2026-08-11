'use client'

import { useState } from 'react'

import { Button } from '../button'
import { Dialog, dialogStyles } from '../Dialog'

import { preventDismissForRichTextPortals } from './utils/mathLiveKeyboard'
import { RichTextEditor } from './RichTextEditor'
import type { PluginId, ToolbarGroup } from './config'
import styles from './styles/RichTextEditorModal.module.css'

type RichTextEditorModalProps = Readonly<{
  isOpen: boolean
  title: string
  value: string
  onClose: () => void
  onSave: (html: string) => void
  /** Forwarded to RichTextEditor — see its `onUploadVideo` prop. */
  onUploadVideo?: (file: File) => Promise<string>
  /** Forwarded to RichTextEditor — see its `onUploadAudio` prop. */
  onUploadAudio?: (file: File) => Promise<string>
  plugins?: readonly PluginId[]
  toolbar?: readonly ToolbarGroup[]
}>

export function RichTextEditorModal({
  isOpen,
  title,
  value,
  onClose,
  onSave,
  onUploadVideo,
  onUploadAudio,
  plugins,
  toolbar,
}: RichTextEditorModalProps) {
  return (
    <Dialog
      isOpen={isOpen}
      title={title}
      titleClassName={styles.title}
      onClose={onClose}
      size="lg"
      className={styles.dialog}
      // MathLive keyboard + table overlays portal to document.body.
      onPointerDownOutside={preventDismissForRichTextPortals}
      onInteractOutside={preventDismissForRichTextPortals}
      onFocusOutside={preventDismissForRichTextPortals}
    >
      <RichTextEditorModalBody
        key={value}
        value={value}
        onClose={onClose}
        onSave={onSave}
        onUploadVideo={onUploadVideo}
        onUploadAudio={onUploadAudio}
        plugins={plugins}
        toolbar={toolbar}
      />
    </Dialog>
  )
}

function RichTextEditorModalBody({
  value,
  onClose,
  onSave,
  onUploadVideo,
  onUploadAudio,
  plugins,
  toolbar,
}: Readonly<
  Pick<
    RichTextEditorModalProps,
    'value' | 'onClose' | 'onSave' | 'onUploadVideo' | 'onUploadAudio' | 'plugins' | 'toolbar'
  >
>) {
  const [draft, setDraft] = useState(value)

  return (
    <>
      <div className={styles.editorShell}>
        <RichTextEditor
          value={draft}
          onChange={setDraft}
          onUploadVideo={onUploadVideo}
          onUploadAudio={onUploadAudio}
          plugins={plugins}
          toolbar={toolbar}
        />
      </div>
      <div className={styles.actions}>
        <Button type="button" variant="outline" onClick={onClose} className={dialogStyles.cancelButton}>
          ยกเลิก
        </Button>
        <Button
          type="button"
          onClick={() => {
            onSave(draft)
            onClose()
          }}
          className={dialogStyles.primaryButton}
        >
          บันทึก
        </Button>
      </div>
    </>
  )
}
