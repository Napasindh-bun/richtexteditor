import './styles.css'
import 'katex/dist/katex.min.css'

export { RichTextEditor } from './components/ui/richTextEditor/RichTextEditor'
export { RichTextEditorModal } from './components/ui/richTextEditor/RichTextEditorModal'
export { RichTextField } from './components/ui/richTextEditor/RichTextField'
export { RichTextHtmlPreview } from './components/ui/richTextEditor/RichTextHtmlPreview'
export { MathLiveDialog } from './components/ui/richTextEditor/dialogs/MathLiveDialog'
export type { MathLiveDialogVariant } from './components/ui/richTextEditor/dialogs/MathLiveDialog'
export {
  DEFAULT_PLUGINS,
  DEFAULT_TOOLBAR,
  FULL_TOOLBAR,
  resolveEditorConfig,
  toolbarFromTemplate,
} from './components/ui/richTextEditor/config'
export type {
  PluginId,
  ToolbarGroup,
  ToolbarItemId,
  ToolbarSlotId,
  ToolbarTemplateId,
  ResolvedEditorConfig,
} from './components/ui/richTextEditor/config'
export type {
  CustomToolbarButton,
  CustomToolbarButtons,
  CustomToolbarMenuItem,
  EditorSetup,
} from './components/ui/richTextEditor/customToolbar'
export type { Editor } from '@tiptap/react'
