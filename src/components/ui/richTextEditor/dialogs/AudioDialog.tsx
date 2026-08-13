'use client'

import { useEffect, useId, useState } from 'react'
import { Upload } from 'lucide-react'

import { Button } from '../../button'
import { Dialog, dialogStyles } from '../../Dialog'
import { Input } from '../../input'
import { Label } from '../../label'

import styles from '../styles/VideoDialog.module.css'

type AudioDialogProps = Readonly<{
  isOpen: boolean
  initialUrl?: string
  onClose: () => void
  onSave: (url: string) => void
  onPickFile: () => void
}>

export function AudioDialog({
  isOpen,
  initialUrl = '',
  onClose,
  onSave,
  onPickFile,
}: AudioDialogProps) {
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
      title="แทรกเสียง"
      onClose={onClose}
      size="sm"
      actions={
        <>
          <Button type="button" variant="outline" onClick={onClose} className={dialogStyles.cancelButton}>
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
          URL ไฟล์เสียง
        </Label>
        <Input
          id={inputId}
          type="url"
          value={url}
          placeholder="https://example.com/audio.mp3"
          autoFocus
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              handleSave()
            }
          }}
        />
        <p className={styles.hint}>วางลิงก์ไฟล์เสียง หรืออัปโหลดจากเครื่อง รองรับ MP3, WAV, OGG และ M4A</p>

        <button type="button" className={styles.uploadRow} onClick={onPickFile}>
          <Upload aria-hidden />
          อัปโหลดจากเครื่อง
        </button>
      </div>
    </Dialog>
  )
}
