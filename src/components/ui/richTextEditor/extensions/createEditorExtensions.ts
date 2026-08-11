import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Highlight from '@tiptap/extension-highlight'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Mathematics } from '@tiptap/extension-mathematics'
import SubscriptExtension from '@tiptap/extension-subscript'
import SuperscriptExtension from '@tiptap/extension-superscript'
import TextAlign from '@tiptap/extension-text-align'
import { Color, FontSize, TextStyle } from '@tiptap/extension-text-style'
import type { AnyExtension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'

import type { PluginId } from '../config'
import { DEFAULT_PLUGINS, hasPlugin } from '../config'
import { codeLowlight } from '../utils/codeSampleHighlight'

import { DoubleUnderline } from './doubleUnderlineExtension'
import { LineHeight } from './lineHeightExtension'
import { ParagraphIndent } from './paragraphIndentExtension'
import { RichTextAudio } from './richTextAudioExtension'
import { RichTextImage } from './richTextImageExtension'
import { RichTextVideo } from './richTextVideoExtension'
import {
  StyledTable,
  StyledTableCell,
  StyledTableHeader,
  StyledTableRow,
  StyledTableView,
} from './styledTableCellExtension'

/** TipTap extension stack filtered by enabled plugins. */
export function createEditorExtensions(
  plugins: ReadonlySet<PluginId> = new Set(DEFAULT_PLUGINS),
): AnyExtension[] {
  const extensions: AnyExtension[] = [
    StarterKit.configure({
      heading: false,
      codeBlock: false,
      // StarterKit v3 ships Link + Underline — configure here instead of adding them again.
      link: hasPlugin(plugins, 'link')
        ? {
            openOnClick: false,
            HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
          }
        : false,
      bulletList: hasPlugin(plugins, 'lists') ? undefined : false,
      orderedList: hasPlugin(plugins, 'lists') ? undefined : false,
      listItem: hasPlugin(plugins, 'lists') ? undefined : false,
    }),
  ]

  if (hasPlugin(plugins, 'textStyle')) {
    extensions.push(
      DoubleUnderline,
      SuperscriptExtension,
      SubscriptExtension,
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      LineHeight,
    )
  }

  if (hasPlugin(plugins, 'lists')) {
    extensions.push(TaskList, TaskItem.configure({ nested: true }))
  }

  if (hasPlugin(plugins, 'indent')) {
    extensions.push(ParagraphIndent)
  }

  if (hasPlugin(plugins, 'codeSample')) {
    extensions.push(CodeBlockLowlight.configure({ lowlight: codeLowlight }))
  }

  if (hasPlugin(plugins, 'image')) {
    // TinyMCE treats images as inline atoms: they can be dragged between
    // characters and the caret can continue immediately after them.
    extensions.push(RichTextImage.configure({ allowBase64: true, inline: true }))
  }

  if (hasPlugin(plugins, 'video')) {
    extensions.push(RichTextVideo)
  }

  if (hasPlugin(plugins, 'audio')) {
    extensions.push(RichTextAudio)
  }

  if (hasPlugin(plugins, 'table')) {
    // TipTap built-in column resize (prosemirror-tables columnResizing).
    // `View` is forwarded to columnResizing — the only way table attributes
    // reach the editor DOM while resizing is on.
    extensions.push(
      StyledTable.configure({
        resizable: true,
        handleWidth: 5,
        cellMinWidth: 48,
        lastColumnResizable: true,
        renderWrapper: true,
        View: StyledTableView,
      }),
      StyledTableRow,
      StyledTableHeader,
      StyledTableCell,
    )
  }

  if (hasPlugin(plugins, 'align')) {
    extensions.push(
      TextAlign.configure({
        types: ['paragraph'],
        alignments: ['left', 'center', 'right'],
      }),
    )
  }

  if (hasPlugin(plugins, 'math') || hasPlugin(plugins, 'science')) {
    extensions.push(
      Mathematics.configure({
        katexOptions: { throwOnError: false },
      }),
    )
  }

  return extensions
}
