import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

export function findMathNodeAtPos(
  doc: ProseMirrorNode,
  pos: number,
): { node: ProseMirrorNode; pos: number; type: 'inlineMath' | 'blockMath' } | null {
  const direct = doc.nodeAt(pos)
  if (direct?.type.name === 'inlineMath' || direct?.type.name === 'blockMath') {
    return { node: direct, pos, type: direct.type.name }
  }

  const $pos = doc.resolve(Math.min(Math.max(pos, 0), doc.content.size))
  const before = $pos.nodeBefore
  if (before?.type.name === 'inlineMath' || before?.type.name === 'blockMath') {
    return {
      node: before,
      pos: $pos.pos - before.nodeSize,
      type: before.type.name,
    }
  }
  const next = $pos.nodeAfter
  if (next?.type.name === 'inlineMath' || next?.type.name === 'blockMath') {
    return { node: next, pos: $pos.pos, type: next.type.name }
  }

  return null
}
