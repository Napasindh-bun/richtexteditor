'use client'

import { useEffect, useId, useState } from 'react'

import { Button } from '../../button'
import { Dialog, dialogStyles } from '../../Dialog'
import { Label } from '../../label'

import styles from '../styles/CodeSampleDialog.module.css'

export const CODE_LANGUAGES = [
  ['plaintext', 'Plain text'],
  ['javascript', 'JavaScript'],
  ['typescript', 'TypeScript'],
  ['html', 'HTML'],
  ['css', 'CSS'],
  ['json', 'JSON'],
  ['python', 'Python'],
  ['java', 'Java'],
  ['sql', 'SQL'],
  ['bash', 'Bash'],
] as const

type CodeSampleDialogProps = Readonly<{
  isOpen: boolean
  initialCode?: string
  initialLanguage?: string
  onClose: () => void
  onSave: (code: string, language: string) => void
}>

export function CodeSampleDialog({
  isOpen,
  initialCode = '',
  initialLanguage = 'plaintext',
  onClose,
  onSave,
}: CodeSampleDialogProps) {
  const codeId = useId()
  const languageId = useId()
  const [code, setCode] = useState(initialCode)
  const [language, setLanguage] = useState(initialLanguage)

  useEffect(() => {
    if (!isOpen) return
    setCode(initialCode)
    setLanguage(initialLanguage)
  }, [initialCode, initialLanguage, isOpen])

  return (
    <Dialog
      isOpen={isOpen}
      title="Code sample"
      onClose={onClose}
      size="lg"
      actions={
        <>
          <Button type="button" variant="outline" onClick={onClose} className={dialogStyles.cancelButton}>
            ยกเลิก
          </Button>
          <Button type="button" onClick={() => onSave(code, language)} className={dialogStyles.primaryButton}>
            บันทึก
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <div className={styles.field}>
          <Label htmlFor={languageId}>ภาษา</Label>
          <select
            id={languageId}
            className={styles.select}
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
          >
            {CODE_LANGUAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <Label htmlFor={codeId}>โค้ด</Label>
          <textarea
            id={codeId}
            className={styles.code}
            value={code}
            autoFocus
            spellCheck={false}
            onChange={(event) => setCode(event.target.value)}
          />
        </div>
      </div>
    </Dialog>
  )
}
