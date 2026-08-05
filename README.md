# Rich Text Editor

Rich Text Editor library extracted from the Authoring Tool.

This initial version keeps the existing editor behavior and styling. It is intentionally limited to separating the editor into its own repository; the Authoring Tool integration is not changed as part of this extraction.

## Development

```bash
yarn install
yarn typecheck
yarn build
```

## Public exports

- `RichTextEditor`
- `RichTextEditorModal`
- `RichTextField`
- `RichTextHtmlPreview`
- `MathLiveDialog`
- `MathLiveDialogVariant`
