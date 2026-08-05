/** Shared helpers for MathLive's body-mounted virtual keyboard + Radix dialogs. */

export type DismissOutsideEvent = {
  preventDefault: () => void
  target: EventTarget | null
  detail?: { originalEvent?: Event }
}

export function isMathLiveKeyboardEvent(event: DismissOutsideEvent): boolean {
  const original = event.detail?.originalEvent
  const path =
    typeof original?.composedPath === 'function'
      ? original.composedPath()
      : event.target instanceof Node
        ? [event.target]
        : []

  return path.some(
    (node) =>
      node instanceof Element &&
      (node.classList.contains('ML__keyboard') ||
        node.classList.contains('MLK__backdrop') ||
        node.classList.contains('MLK__plate') ||
        node.localName === 'math-virtual-keyboard'),
  )
}

export function isTablePortalEvent(event: DismissOutsideEvent): boolean {
  const original = event.detail?.originalEvent
  const path =
    typeof original?.composedPath === 'function'
      ? original.composedPath()
      : event.target instanceof Node
        ? [event.target]
        : []

  return path.some(
    (node) =>
      node instanceof Element &&
      Boolean(
        node.closest('[data-table-cell-menu], [data-table-row-resize-handle]'),
      ),
  )
}

/** Keep a Radix dialog open when the user taps the MathLive keyboard. */
export function preventDismissForMathLiveKeyboard(event: DismissOutsideEvent) {
  if (isMathLiveKeyboardEvent(event)) {
    event.preventDefault()
  }
}

/** MathLive keyboard + table overlays portaled to document.body. */
export function preventDismissForRichTextPortals(event: DismissOutsideEvent) {
  if (isMathLiveKeyboardEvent(event) || isTablePortalEvent(event)) {
    event.preventDefault()
  }
}
