'use client'

import { useRef, useState, type ChangeEvent, type RefObject } from 'react'
import type { Editor } from '@tiptap/react'

import { parseVideoSource } from '../extensions/richTextVideoExtension'
import { readFileAsDataUrl } from './mediaHelpers'

type UseMediaDialogsArgs = Readonly<{
  editor: Editor | null
  onUploadVideo?: (file: File) => Promise<string>
  onUploadAudio?: (file: File) => Promise<string>
}>

type UseMediaDialogsResult = Readonly<{
  imageDialogOpen: boolean
  videoDialogOpen: boolean
  audioDialogOpen: boolean
  setImageDialogOpen: (open: boolean) => void
  setVideoDialogOpen: (open: boolean) => void
  setAudioDialogOpen: (open: boolean) => void
  fileInputRef: RefObject<HTMLInputElement | null>
  videoInputRef: RefObject<HTMLInputElement | null>
  audioInputRef: RefObject<HTMLInputElement | null>
  handleSaveImageUrl: (url: string) => void
  handleImageSelected: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  handleSaveVideoUrl: (url: string) => void
  handleVideoSelected: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  handleSaveAudioUrl: (url: string) => void
  handleAudioSelected: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
}>

export function useMediaDialogs({
  editor,
  onUploadVideo,
  onUploadAudio,
}: UseMediaDialogsArgs): UseMediaDialogsResult {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [videoDialogOpen, setVideoDialogOpen] = useState(false)
  const [audioDialogOpen, setAudioDialogOpen] = useState(false)

  const insertImage = (src: string) => {
    editor?.chain().focus().setImage({ src }).run()
  }

  const handleSaveImageUrl = (url: string) => {
    const trimmed = url.trim()
    setImageDialogOpen(false)
    if (trimmed) insertImage(trimmed)
  }

  const handleImageSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !editor) return

    try {
      const src = await readFileAsDataUrl(file)
      if (!src) return
      setImageDialogOpen(false)
      insertImage(src)
    } catch {
      // Ignore unreadable files; the editor stays unchanged.
    }
  }

  const insertVideo = (src: string, provider: 'file' | 'youtube') => {
    editor?.chain().focus().insertContent({ type: 'video', attrs: { src, provider } }).run()
  }

  const handleSaveVideoUrl = (url: string) => {
    const source = parseVideoSource(url)
    setVideoDialogOpen(false)
    if (source) insertVideo(source.src, source.provider)
  }

  const handleVideoSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !editor) return

    try {
      const src = onUploadVideo ? await onUploadVideo(file) : await readFileAsDataUrl(file)
      if (!src) return
      setVideoDialogOpen(false)
      insertVideo(src, 'file')
    } catch {
      // Upload failed or the file is unreadable; the editor stays unchanged.
    }
  }

  const insertAudio = (src: string) => {
    editor?.chain().focus().insertContent({ type: 'audio', attrs: { src } }).run()
  }

  const handleSaveAudioUrl = (url: string) => {
    const trimmed = url.trim()
    setAudioDialogOpen(false)
    if (trimmed) insertAudio(trimmed)
  }

  const handleAudioSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !editor) return

    try {
      const src = onUploadAudio ? await onUploadAudio(file) : await readFileAsDataUrl(file)
      if (!src) return
      setAudioDialogOpen(false)
      insertAudio(src)
    } catch {
      // Upload failed or the file is unreadable; the editor stays unchanged.
    }
  }

  return {
    imageDialogOpen,
    videoDialogOpen,
    audioDialogOpen,
    setImageDialogOpen,
    setVideoDialogOpen,
    setAudioDialogOpen,
    fileInputRef,
    videoInputRef,
    audioInputRef,
    handleSaveImageUrl,
    handleImageSelected,
    handleSaveVideoUrl,
    handleVideoSelected,
    handleSaveAudioUrl,
    handleAudioSelected,
  }
}
