import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { useState, type ChangeEvent, type MouseEvent } from 'react'

import { ChoiceDropdownDialog } from './ChoiceDropdownDialog'
import { parseDropdownOptions } from './dropdownOptions'
import './choiceDropdown.css'

export function ChoiceDropdownNodeView({
  node,
  updateAttributes,
  selected,
}: Readonly<NodeViewProps>) {
  const [isOpen, setIsOpen] = useState(false)
  const options = parseDropdownOptions(node.attrs.options)
  const value = String(node.attrs.value ?? '')
  const selectValue = options.includes(value) ? value : ''

  const openEditor = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setIsOpen(true)
  }

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    updateAttributes({ value: event.target.value })
  }

  return (
    <NodeViewWrapper
      as="span"
      className={selected ? 'choice-dropdown-node is-selected' : 'choice-dropdown-node'}
      contentEditable={false}
      title="ดับเบิลคลิกเพื่อแก้ไขตัวเลือก"
      style={{ outline: 'none' }}
      onDoubleClick={openEditor}
    >
      <select
        className="choice-dropdown-select"
        value={selectValue}
        onChange={handleChange}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <option value="">เลือกคำตอบ</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChoiceDropdownDialog
        isOpen={isOpen}
        initialOptions={options}
        onClose={() => setIsOpen(false)}
        onSave={(next) => {
          updateAttributes({
            options: next,
            value: next.includes(value) ? value : '',
          })
          setIsOpen(false)
        }}
      />
    </NodeViewWrapper>
  )
}
