'use client'

import { Upload } from 'lucide-react'

import { Button } from '../button'
import { Dialog, dialogStyles } from '../Dialog'

import styles from './styles/VideoDialog.module.css'

type AudioDialogProps = Readonly<{
  isOpen: boolean
  onClose: () => void
  onPickFile: () => void
}>

export function AudioDialog({ isOpen, onClose, onPickFile }: AudioDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      title="แทรกเสียง"
      onClose={onClose}
      size="sm"
      actions={
        <Button type="button" variant="outline" onClick={onClose} className={dialogStyles.cancelButton}>
          ยกเลิก
        </Button>
      }
    >
      <div className={styles.body}>
        <p className={styles.hint}>อัปโหลดไฟล์เสียงจากเครื่องเท่านั้น รองรับ MP3, WAV, OGG และ M4A</p>
        <button type="button" className={styles.uploadRow} onClick={onPickFile}>
          <Upload aria-hidden />
          อัปโหลดจากเครื่อง
        </button>
      </div>
    </Dialog>
  )
}
