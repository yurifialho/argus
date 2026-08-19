import { useRef, useState } from 'react'

export default function CodeEditor({ value, onChange, disabled }) {
  const textareaRef = useRef(null)
  const gutterRef = useRef(null)
  const [blockedHint, setBlockedHint] = useState(false)

  const lineCount = value.split('\n').length

  function flashBlockedHint() {
    setBlockedHint(true)
    window.clearTimeout(flashBlockedHint._t)
    flashBlockedHint._t = window.setTimeout(() => setBlockedHint(false), 2200)
  }

  function handleScroll(e) {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.target.scrollTop
    }
  }

  function handleKeyDown(e) {
    // Bloqueia colar via atalho de teclado (Ctrl+V / Cmd+V) e recorte "amplificado"
    // (o navegador ainda dispara o evento "paste" nesses casos, mas o preventDefault
    // fica no handler de paste; aqui só damos feedback mais cedo quando possível).
    if (e.key === 'Tab') {
      e.preventDefault()
      const el = textareaRef.current
      const start = el.selectionStart
      const end = el.selectionEnd
      const newValue = value.slice(0, start) + '    ' + value.slice(end)
      onChange(newValue)
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 4
      })
    }
  }

  function handlePaste(e) {
    e.preventDefault()
    flashBlockedHint()
  }

  function handleDrop(e) {
    // Impede arrastar texto/arquivos para dentro do editor (outra forma de "colar").
    e.preventDefault()
    flashBlockedHint()
  }

  return (
    <div className="code-editor">
      <div className="code-editor__gutter" ref={gutterRef} aria-hidden="true">
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i} className="code-editor__line-number">
            {i + 1}
          </div>
        ))}
      </div>
      <div className="code-editor__inputwrap">
        <textarea
          ref={textareaRef}
          className="code-editor__textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onContextMenu={(e) => e.preventDefault()}
          disabled={disabled}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder="# escreva seu código Python aqui (colar está desabilitado)"
        />
        {blockedHint && <div className="code-editor__hint">Colar está desabilitado. Digite o código.</div>}
      </div>
    </div>
  )
}
