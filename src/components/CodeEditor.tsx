import Editor from '@monaco-editor/react'
import type { OnMount } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useEffect, useRef } from 'react'
import '#/lib/monaco-setup'

type Props = {
  value: string
  language: string
  theme: 'dark' | 'light'
  tabSize: number
  onChange: (value: string) => void
  /** Called for explicit format requests (Shift+Alt+F). */
  onFormatRequest: () => void
  /** Called on Cmd/Ctrl+S and when the editor loses focus. */
  onSaveOrBlur: () => void
  onRun: () => void
  /** Imperative handle to replace content while preserving undo history. */
  editorRef: React.MutableRefObject<editor.IStandaloneCodeEditor | null>
}

export default function CodeEditor({
  value,
  language,
  theme,
  tabSize,
  onChange,
  onFormatRequest,
  onSaveOrBlur,
  onRun,
  editorRef,
}: Props) {
  // Keep latest callbacks reachable from Monaco commands registered once.
  const cbs = useRef({ onFormatRequest, onSaveOrBlur, onRun })
  cbs.current = { onFormatRequest, onSaveOrBlur, onRun }

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    editor.addCommand(
      monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
      () => cbs.current.onFormatRequest(),
    )
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () =>
      cbs.current.onSaveOrBlur(),
    )
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () =>
      cbs.current.onRun(),
    )
    editor.onDidBlurEditorText(() => cbs.current.onSaveOrBlur())
  }

  useEffect(() => {
    editorRef.current
      ?.getModel()
      ?.updateOptions({ tabSize, insertSpaces: true })
  }, [tabSize, editorRef])

  return (
    <Editor
      value={value}
      language={language}
      theme={theme === 'dark' ? 'vs-dark' : 'light'}
      onChange={(v) => onChange(v ?? '')}
      onMount={handleMount}
      options={{
        tabSize,
        insertSpaces: true,
        detectIndentation: false,
        minimap: { enabled: false },
        fontSize: 14,
        scrollBeyondLastLine: false,
        automaticLayout: true,
      }}
    />
  )
}
