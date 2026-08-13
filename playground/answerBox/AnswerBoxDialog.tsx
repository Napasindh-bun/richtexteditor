import { useEffect, useId, useState } from 'react'

import { Button } from '../../src/components/ui/button'
import { Dialog, dialogStyles } from '../../src/components/ui/Dialog'
import { Input } from '../../src/components/ui/input'
import { Label } from '../../src/components/ui/label'

type AnswerBoxDialogProps = Readonly<{
  isOpen: boolean
  initialValue: string
  onClose: () => void
  onSave: (value: string) => void
}>

export function AnswerBoxDialog({
  isOpen,
  initialValue,
  onClose,
  onSave,
}: AnswerBoxDialogProps) {
  const inputId = useId()
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    if (isOpen) setValue(initialValue)
  }, [initialValue, isOpen])

  const handleSave = () => {
    onSave(value.trim())
  }

  return (
    <Dialog
      isOpen={isOpen}
      title="แก้ไขกล่องคำตอบ"
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
      <div style={{ marginTop: 16, textAlign: 'left' }}>
        <Label htmlFor={inputId}>คำตอบ</Label>
        <Input
          id={inputId}
          value={value}
          placeholder="พิมพ์คำตอบ"
          autoFocus
          style={{ marginTop: 8 }}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              handleSave()
            }
          }}
        />
      </div>
    </Dialog>
  )
}
