'use client'

import { useEffect, useId, useState } from 'react'

import { Button } from '../button'
import { Dialog, dialogStyles } from '../Dialog'

import { formatHtml } from './formatHtml'
import styles from './styles/SourceCodeDialog.module.css'

type SourceCodeDialogProps = Readonly<{
  isOpen: boolean
  html: string
  onClose: () => void
  onSave: (html: string) => void
}>

/** TinyMCE-style raw HTML editor for the document. */
export function SourceCodeDialog({ isOpen, html, onClose, onSave }: SourceCodeDialogProps) {
  const textareaId = useId()
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (isOpen) setDraft(formatHtml(html))
  }, [html, isOpen])

  return (
    <Dialog
      isOpen={isOpen}
      title="Source code"
      titleClassName={styles.title}
      onClose={onClose}
      size="lg"
      className={styles.dialog}
      actions={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className={dialogStyles.cancelButton}
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            onClick={() => onSave(draft)}
            className={dialogStyles.primaryButton}
          >
            บันทึก
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <textarea
          id={textareaId}
          aria-label="HTML source"
          className={styles.textarea}
          value={draft}
          spellCheck={false}
          autoComplete="off"
          wrap="off"
          onChange={(event) => setDraft(event.target.value)}
        />
      </div>
    </Dialog>
  )
}
