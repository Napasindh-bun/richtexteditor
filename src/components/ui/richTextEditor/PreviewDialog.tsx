'use client'

import { Button } from '../button'
import { Dialog, dialogStyles } from '../Dialog'

import { RichTextHtmlPreview } from './RichTextHtmlPreview'
import styles from './styles/PreviewDialog.module.css'

type PreviewDialogProps = Readonly<{
  isOpen: boolean
  html: string
  onClose: () => void
}>

export function PreviewDialog({ isOpen, html, onClose }: PreviewDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      title="Preview"
      titleClassName={styles.title}
      onClose={onClose}
      size="lg"
      className={styles.dialog}
      actions={
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className={dialogStyles.cancelButton}
        >
          Close
        </Button>
      }
    >
      <div className={styles.body}>
        <RichTextHtmlPreview html={html} className={styles.preview} />
      </div>
    </Dialog>
  )
}
