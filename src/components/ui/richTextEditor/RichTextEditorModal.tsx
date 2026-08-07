'use client'

import { useState } from 'react'

import { Button } from '../button'
import { Dialog, dialogStyles } from '../Dialog'

import { preventDismissForRichTextPortals } from './mathLiveKeyboard'
import { RichTextEditor } from './RichTextEditor'
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
}>

export function RichTextEditorModal({
  isOpen,
  title,
  value,
  onClose,
  onSave,
  onUploadVideo,
  onUploadAudio,
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
}: Readonly<Pick<RichTextEditorModalProps, 'value' | 'onClose' | 'onSave' | 'onUploadVideo' | 'onUploadAudio'>>) {
  const [draft, setDraft] = useState(value)

  return (
    <>
      <div className={styles.editorShell}>
        <RichTextEditor
          value={draft}
          onChange={setDraft}
          onUploadVideo={onUploadVideo}
          onUploadAudio={onUploadAudio}
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
