import { useState } from 'react'

import {
  RichTextEditor,
  RichTextField,
  RichTextHtmlPreview,
} from '../src/index'

const SAMPLE_HTML =
  '<p>Try editing this text — use the toolbar for <strong>bold</strong>, <em>italic</em>, lists, tables, images, audio, video, source code, fullscreen, and math.</p>'

/** Stands in for a real upload so the URL path can be exercised without a backend. */
async function fakeUploadVideo(file: File) {
  console.log('onUploadVideo called with', file.name, file.type, file.size)
  return 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'
}

async function fakeUploadAudio(file: File) {
  console.log('onUploadAudio called with', file.name, file.type, file.size)
  return 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3'
}

export function App() {
  const [editorHtml, setEditorHtml] = useState(SAMPLE_HTML)
  const [fieldHtml, setFieldHtml] = useState('')
  const [isFieldEditorOpen, setIsFieldEditorOpen] = useState(false)

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>Rich Text Editor Playground</h1>
        <p style={styles.subtitle}>ทดสอบ component ในโปรเจกต์นี้โดยตรง</p>
      </header>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>RichTextEditor</h2>
        <RichTextEditor value={editorHtml} onChange={setEditorHtml} height={480} />
        <details style={styles.details}>
          <summary>HTML output</summary>
          <pre style={styles.pre}>{editorHtml}</pre>
        </details>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>RichTextField + Modal</h2>
        <RichTextField
          label="คำถาม"
          value={fieldHtml}
          placeholder="คลิกเพื่อเปิด editor"
          editorTitle="แก้ไขคำถาม"
          isEditorOpen={isFieldEditorOpen}
          onOpenEditor={() => setIsFieldEditorOpen(true)}
          onCloseEditor={() => setIsFieldEditorOpen(false)}
          onSave={(html) => {
            setFieldHtml(html)
            setIsFieldEditorOpen(false)
          }}
          onUploadVideo={fakeUploadVideo}
          onUploadAudio={fakeUploadAudio}
        />
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>RichTextHtmlPreview</h2>
        <div style={styles.previewBox}>
          <RichTextHtmlPreview html={editorHtml} fallback="ไม่มีเนื้อหา" />
        </div>
      </section>
    </div>
  )
}

const styles = {
  page: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '32px 24px 64px',
    fontFamily: 'system-ui, sans-serif',
    color: '#1a1a1a',
    background: '#f7f7f5',
    minHeight: '100vh',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
  },
  subtitle: {
    margin: '8px 0 0',
    color: '#666',
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    margin: '0 0 12px',
    fontSize: 18,
    fontWeight: 600,
  },
  details: {
    marginTop: 12,
  },
  pre: {
    margin: '8px 0 0',
    padding: 12,
    overflow: 'auto',
    fontSize: 12,
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: 8,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  previewBox: {
    padding: 16,
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: 8,
  },
} as const
