import { useEffect, useState } from 'react'

import { Button } from '../../src/components/ui/button'
import { Dialog, dialogStyles } from '../../src/components/ui/Dialog'
import { Input } from '../../src/components/ui/input'
import { Label } from '../../src/components/ui/label'

type ChoiceDropdownDialogProps = Readonly<{
  isOpen: boolean
  initialOptions: readonly string[]
  onClose: () => void
  onSave: (options: string[]) => void
}>

export function ChoiceDropdownDialog({
  isOpen,
  initialOptions,
  onClose,
  onSave,
}: ChoiceDropdownDialogProps) {
  const [options, setOptions] = useState<string[]>([...initialOptions])

  useEffect(() => {
    if (isOpen) setOptions(initialOptions.length > 0 ? [...initialOptions] : [''])
  }, [initialOptions, isOpen])

  const handleSave = () => {
    const next = options.map((item) => item.trim()).filter(Boolean)
    if (next.length === 0) return
    onSave(next)
  }

  return (
    <Dialog
      isOpen={isOpen}
      title="แก้ไข Dropdown"
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
      <div style={{ marginTop: 16, display: 'grid', gap: 8, textAlign: 'left' }}>
        {options.map((option, index) => (
          <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Label htmlFor={`dropdown-option-${index}`} style={{ display: 'none' }}>
              ตัวเลือก {index + 1}
            </Label>
            <Input
              id={`dropdown-option-${index}`}
              value={option}
              placeholder={`ตัวเลือก ${index + 1}`}
              onChange={(event) => {
                const next = [...options]
                next[index] = event.target.value
                setOptions(next)
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={options.length <= 1}
              onClick={() => setOptions(options.filter((_, itemIndex) => itemIndex !== index))}
            >
              ลบ
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={() => setOptions([...options, ''])}>
          เพิ่มตัวเลือก
        </Button>
      </div>
    </Dialog>
  )
}
