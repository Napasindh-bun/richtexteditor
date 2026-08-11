'use client'

import { useId, useState } from 'react'

import { cn } from '@libs'

import { Button } from '../button'
import { Dialog, dialogStyles } from '../Dialog'
import { Input } from '../input'
import { Label } from '../label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../select'

import { ColorPickerDialog } from './ColorPickerDialog'
import {
  borderWidthForStyle,
  TABLE_BORDER_STYLES,
  type TablePropertiesValues,
} from './tableProperties'
import styles from './styles/TablePropertiesDialog.module.css'

type TablePropertiesDialogProps = Readonly<{
  isOpen: boolean
  initialValues: TablePropertiesValues
  onClose: () => void
  onSave: (values: TablePropertiesValues) => void
}>

function ColorFieldInput({
  id,
  label,
  value,
  onChange,
  onOpenPicker,
}: Readonly<{
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  onOpenPicker: () => void
}>) {
  const swatchStyle = value ? { backgroundColor: value } : undefined

  return (
    <div className={styles.field}>
      <Label htmlFor={id} className={styles.label}>
        {label}
      </Label>
      <div className={styles.colorRow}>
        <button
          type="button"
          className={cn(styles.colorSwatch, !value && styles.colorSwatchEmpty)}
          style={swatchStyle}
          aria-label={`Pick ${label}`}
          onClick={onOpenPicker}
        />
        <Input
          id={id}
          value={value}
          placeholder="#000000"
          className={styles.colorInput}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  )
}

function TablePropertiesForm({
  initialValues,
  onClose,
  onSave,
}: Readonly<{
  initialValues: TablePropertiesValues
  onClose: () => void
  onSave: (values: TablePropertiesValues) => void
}>) {
  const titleId = useId()
  const [values, setValues] = useState(initialValues)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)

  const patch = <K extends keyof TablePropertiesValues>(key: K, value: TablePropertiesValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <>
      <Dialog
        isOpen
        title="Table Properties"
        titleId={titleId}
        onClose={onClose}
        size="sm"
        onPointerDownOutside={(event) => {
          if (colorPickerOpen) event.preventDefault()
        }}
        onInteractOutside={(event) => {
          if (colorPickerOpen) event.preventDefault()
        }}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className={dialogStyles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => onSave(values)}
              className={dialogStyles.primaryButton}
            >
              Save
            </Button>
          </>
        }
      >
        <div className={styles.stack}>
          <div className={styles.field}>
            <Label htmlFor={`${titleId}-border-width`} className={styles.label}>
              Border width
            </Label>
            <Input
              id={`${titleId}-border-width`}
              value={values.borderWidth}
              onChange={(event) => patch('borderWidth', event.target.value)}
            />
          </div>

          <div className={styles.field}>
            <Label className={styles.label}>Border style</Label>
            <Select
              value={values.borderStyle || 'solid'}
              onValueChange={(next) =>
                setValues((prev) => ({
                  ...prev,
                  borderStyle: next,
                  // double/groove/ridge/inset/outset render as solid when too thin.
                  borderWidth: borderWidthForStyle(next, prev.borderWidth),
                }))
              }
            >
              <SelectTrigger aria-label="Border style">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {TABLE_BORDER_STYLES.map((style) => (
                  <SelectItem key={style} value={style}>
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ColorFieldInput
            id={`${titleId}-border-color`}
            label="Border color"
            value={values.borderColor}
            onChange={(next) => patch('borderColor', next)}
            onOpenPicker={() => setColorPickerOpen(true)}
          />
        </div>
      </Dialog>

      <ColorPickerDialog
        isOpen={colorPickerOpen}
        initialColor={values.borderColor || '#d1d5db'}
        onClose={() => setColorPickerOpen(false)}
        onSave={(hex) => {
          patch('borderColor', hex)
          setColorPickerOpen(false)
        }}
      />
    </>
  )
}

export function TablePropertiesDialog({
  isOpen,
  initialValues,
  onClose,
  onSave,
}: TablePropertiesDialogProps) {
  if (!isOpen) return null

  return (
    <TablePropertiesForm
      key={`${initialValues.borderWidth}-${initialValues.borderStyle}-${initialValues.borderColor}`}
      initialValues={initialValues}
      onClose={onClose}
      onSave={onSave}
    />
  )
}
