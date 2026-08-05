'use client'

import { useEffect, useId, useState } from 'react'

import { Button } from '../button'
import { Dialog, dialogStyles } from '../Dialog'
import { Input } from '../input'
import { Label } from '../label'

import styles from './styles/LinkDialog.module.css'

type LinkDialogProps = Readonly<{
  isOpen: boolean
  initialUrl?: string
  onClose: () => void
  onSave: (url: string) => void
}>

export function LinkDialog({
  isOpen,
  initialUrl = '',
  onClose,
  onSave,
}: LinkDialogProps) {
  const inputId = useId()
  const [url, setUrl] = useState(initialUrl)
  const isEditing = Boolean(initialUrl.trim())
  const title = isEditing ? 'แก้ไขลิงก์' : 'เพิ่มลิงก์'

  useEffect(() => {
    if (isOpen) setUrl(initialUrl)
  }, [isOpen, initialUrl])

  const handleSave = () => {
    onSave(url.trim())
  }

  return (
    <Dialog
      isOpen={isOpen}
      title={title}
      onClose={onClose}
      size="sm"
      actions={
        <>
          <Button type="button" variant="outline" onClick={onClose} className={dialogStyles.cancelButton}>
            ยกเลิก
          </Button>
          <Button type="button" onClick={handleSave} className={dialogStyles.primaryButton}>
            บันทึก
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <Label htmlFor={inputId} className={styles.label}>
          URL
        </Label>
        <Input
          id={inputId}
          type="url"
          value={url}
          placeholder="https://example.com"
          autoFocus
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              handleSave()
            }
          }}
        />
        <p className={styles.hint}>เว้นว่างแล้วกดบันทึกเพื่อลบลิงก์</p>
      </div>
    </Dialog>
  )
}
