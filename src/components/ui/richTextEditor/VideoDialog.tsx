'use client'

import { useEffect, useId, useState } from 'react'
import { Upload } from 'lucide-react'

import { Button } from '../button'
import { Dialog, dialogStyles } from '../Dialog'
import { Input } from '../input'
import { Label } from '../label'

import styles from './styles/VideoDialog.module.css'

type VideoDialogProps = Readonly<{
  isOpen: boolean
  initialUrl?: string
  onClose: () => void
  onSave: (url: string) => void
  onPickFile: () => void
}>

export function VideoDialog({
  isOpen,
  initialUrl = '',
  onClose,
  onSave,
  onPickFile,
}: VideoDialogProps) {
  const inputId = useId()
  const [url, setUrl] = useState(initialUrl)

  useEffect(() => {
    if (isOpen) setUrl(initialUrl)
  }, [initialUrl, isOpen])

  const handleSave = () => {
    const trimmed = url.trim()
    if (trimmed) onSave(trimmed)
  }

  return (
    <Dialog
      isOpen={isOpen}
      title="แทรกวิดีโอ"
      onClose={onClose}
      size="sm"
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
            onClick={handleSave}
            disabled={!url.trim()}
            className={dialogStyles.primaryButton}
          >
            บันทึก
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <Label htmlFor={inputId} className={styles.label}>
          URL วิดีโอ หรือ ลิงก์ YouTube
        </Label>
        <Input
          id={inputId}
          type="url"
          value={url}
          placeholder="https://www.youtube.com/watch?v=..."
          autoFocus
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              handleSave()
            }
          }}
        />
        <p className={styles.hint}>รองรับ YouTube (watch / youtu.be / embed / shorts) และไฟล์วิดีโอโดยตรง</p>

        <button type="button" className={styles.uploadRow} onClick={onPickFile}>
          <Upload aria-hidden />
          อัปโหลดจากเครื่อง
        </button>
      </div>
    </Dialog>
  )
}
