import type { VirtualKeyboardLayout, VirtualKeyboardName } from 'mathlive'

/** Chemistry / science layout for MathLive virtual keyboard. */
export const SCIENCE_KEYBOARD_LAYOUT: VirtualKeyboardLayout = {
  label: 'วิทย์',
  tooltip: 'สูตรวิทยาศาสตร์',
  id: 'science',
  rows: [
    [
      { label: 'H', latex: 'H' },
      { label: 'C', latex: 'C' },
      { label: 'N', latex: 'N' },
      { label: 'O', latex: 'O' },
      { label: 'Na', latex: 'Na' },
      { label: 'Cl', latex: 'Cl' },
      { label: 'S', latex: 'S' },
      { label: 'P', latex: 'P' },
      { label: 'Fe', latex: 'Fe' },
      { label: 'Cu', latex: 'Cu' },
    ],
    [
      { label: '₀', latex: '_0' },
      { label: '₁', latex: '_1' },
      { label: '₂', latex: '_2' },
      { label: '₃', latex: '_3' },
      { label: '₄', latex: '_4' },
      { label: '⁺', latex: '^{+}' },
      { label: '⁻', latex: '^{-}' },
      { label: '²⁺', latex: '^{2+}' },
      { label: '²⁻', latex: '^{2-}' },
      { label: '³⁺', latex: '^{3+}' },
    ],
    [
      { label: '→', latex: '\\rightarrow' },
      { label: '⇌', latex: '\\rightleftharpoons' },
      { label: '↑', latex: '\\uparrow' },
      { label: '↓', latex: '\\downarrow' },
      { label: '(s)', latex: '\\text{(s)}' },
      { label: '(l)', latex: '\\text{(l)}' },
      { label: '(g)', latex: '\\text{(g)}' },
      { label: '(aq)', latex: '\\text{(aq)}' },
      { label: '+', latex: '+' },
      { label: '=', latex: '=' },
    ],
    [
      { label: 'ce', latex: '\\ce{#0}', class: 'tex' },
      { label: 'pu', latex: '\\pu{#0}', class: 'tex' },
      { label: 'Δ', latex: '\\Delta' },
      { label: '°C', latex: '\\text{°C}' },
      { label: 'mol', latex: '\\text{mol}' },
      { label: 'g', latex: '\\text{g}' },
      { label: 'L', latex: '\\text{L}' },
      { label: 'M', latex: '\\text{M}' },
      '[backspace]',
      '[return]',
    ],
  ],
}

export const SCIENCE_KEYBOARD_LAYOUTS: (VirtualKeyboardName | VirtualKeyboardLayout)[] = [
  SCIENCE_KEYBOARD_LAYOUT,
  'numeric',
  'greek',
  'alphabetic',
]

export const MATH_KEYBOARD_LAYOUTS: VirtualKeyboardName[] = [
  'numeric',
  'symbols',
  'alphabetic',
  'greek',
]

/** Ensure chemistry content is wrapped for KaTeX mhchem when needed. */
export function normalizeScienceLatex(latex: string): string {
  const trimmed = latex.trim()
  if (!trimmed) return ''
  if (/\\ce\s*\{/.test(trimmed) || /\\pu\s*\{/.test(trimmed)) return trimmed
  return `\\ce{${trimmed}}`
}
