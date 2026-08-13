import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { useState, type CSSProperties, type MouseEvent } from 'react'

import { AnswerBoxDialog } from './AnswerBoxDialog'
import './answerBox.css'

const boxStyle: CSSProperties = {
  display: 'inline-block',
  minWidth: 64,
  maxWidth: 160,
  margin: '0 4px',
  padding: '1px 8px',
  verticalAlign: 'baseline',
  overflow: 'hidden',
  border: '1px solid #94a3b8',
  borderRadius: 6,
  background: '#fff',
  fontSize: 13,
  lineHeight: 1.45,
  textAlign: 'center',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  userSelect: 'none',
}

const placeholderStyle: CSSProperties = {
  ...boxStyle,
  color: '#94a3b8',
  background: '#f8fafc',
}

export function AnswerBoxNodeView({ node, updateAttributes, selected }: Readonly<NodeViewProps>) {
  const [isOpen, setIsOpen] = useState(false)
  const value = String(node.attrs.value ?? '')
  const isEmpty = value.trim().length === 0

  const openEditor = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setIsOpen(true)
  }

  const chipStyle: CSSProperties = {
    ...(isEmpty ? placeholderStyle : boxStyle),
    ...(selected
      ? {
          borderColor: '#3b82f6',
          boxShadow: '0 0 0 2px #3b82f6',
        }
      : null),
  }

  return (
    <NodeViewWrapper
      as="span"
      className="answer-box-node"
      contentEditable={false}
      title="ดับเบิลคลิกเพื่อแก้ไข"
      style={{ outline: 'none' }}
      onDoubleClick={openEditor}
    >
      <span style={chipStyle}>{isEmpty ? 'คำตอบ' : value}</span>
      <AnswerBoxDialog
        isOpen={isOpen}
        initialValue={value}
        onClose={() => setIsOpen(false)}
        onSave={(next) => {
          updateAttributes({ value: next })
          setIsOpen(false)
        }}
      />
    </NodeViewWrapper>
  )
}
