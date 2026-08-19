import { useEffect, useRef, useState } from 'react'
import { newId } from '../utils/id.js'
import { replaceQuestions, fetchResults, clearResultsApi } from '../utils/api.js'

const EXAMPLE_TESTCASES = JSON.stringify(
  [
    {
      description: 'Descrição do caso de teste',
      files: [{ name: 'teste.txt', content: 'linha 1\nlinha 2\nlinha 3\n' }],
      stdinInputs: [],
      assertions: [{ type: 'contains', value: 'linha 2' }]
    }
  ],
  null,
  2
)

function blankQuestion() {
  return {
    id: newId('q'),
    title: '',
    statement: '',
    starterCode: '',
    testCases: []
  }
}

export default function AdminView({ questions, onQuestionsReload, teacherName, onLogout, onExit }) {
  const [tab, setTab] = useState('questoes') // questoes | importar | resultados
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [testCasesText, setTestCasesText] = useState('[]')
  const [jsonError, setJsonError] = useState('')
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')

  const [results, setResults] = useState([])
  const [loadingResults, setLoadingResults] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (tab === 'resultados') loadResults()
  }, [tab])

  function handleAuthError(err) {
    if (err?.status === 401) {
      onLogout()
      return true
    }
    return false
  }

  async function loadResults() {
    setLoadingResults(true)
    setActionError('')
    try {
      const data = await fetchResults()
      setResults(data)
    } catch (err) {
      if (!handleAuthError(err)) setActionError(err.message)
    } finally {
      setLoadingResults(false)
    }
  }

  function startNew() {
    const q = blankQuestion()
    setDraft(q)
    setTestCasesText('[]')
    setJsonError('')
    setEditingId(q.id)
  }

  function startEdit(q) {
    setDraft({ ...q })
    setTestCasesText(JSON.stringify(q.testCases ?? [], null, 2))
    setJsonError('')
    setEditingId(q.id)
  }

  function cancelEdit() {
    setEditingId(null)
    setDraft(null)
    setJsonError('')
  }

  async function persistQuestions(updated) {
    setSaving(true)
    setActionError('')
    try {
      await replaceQuestions(updated)
      await onQuestionsReload()
      return true
    } catch (err) {
      if (!handleAuthError(err)) setActionError(err.message)
      return false
    } finally {
      setSaving(false)
    }
  }

  async function saveDraft() {
    let parsedCases
    try {
      parsedCases = JSON.parse(testCasesText)
      if (!Array.isArray(parsedCases)) throw new Error('O JSON precisa ser uma lista [ ]')
    } catch (e) {
      setJsonError('JSON inválido nos casos de teste: ' + e.message)
      return
    }

    const finalQuestion = { ...draft, testCases: parsedCases }
    const exists = questions.some((q) => q.id === draft.id)
    const updated = exists
      ? questions.map((q) => (q.id === draft.id ? finalQuestion : q))
      : [...questions, finalQuestion]

    const ok = await persistQuestions(updated)
    if (ok) cancelEdit()
  }

  async function removeQuestion(id) {
    if (!confirm('Remover esta questão do banco?')) return
    await persistQuestions(questions.filter((q) => q.id !== id))
  }

  async function moveQuestion(index, dir) {
    const newIndex = index + dir
    if (newIndex < 0 || newIndex >= questions.length) return
    const copy = [...questions]
    ;[copy[index], copy[newIndex]] = [copy[newIndex], copy[index]]
    await persistQuestions(copy)
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(questions, null, 2)], {
      type: 'application/json;charset=utf-8'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'banco-de-questoes.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function importJSON(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result)
        if (!Array.isArray(parsed)) throw new Error('O arquivo precisa conter uma lista de questões')
        const ok = await persistQuestions(parsed)
        if (ok) alert(`${parsed.length} questão(ões) importada(s) com sucesso.`)
      } catch (err) {
        alert('Não foi possível importar: ' + err.message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function handleClearResults() {
    if (!confirm('Apagar todos os resultados salvos?')) return
    try {
      await clearResultsApi()
      loadResults()
    } catch (err) {
      if (!handleAuthError(err)) setActionError(err.message)
    }
  }

  return (
    <div className="admin">
      <div className="admin__topbar">
        <span className="eyebrow">Painel do professor · {teacherName}</span>
        <div className="actions" style={{ margin: 0 }}>
          <button className="btn btn--ghost" onClick={onLogout}>Sair</button>
          <button className="btn btn--ghost" onClick={onExit}>Voltar</button>
        </div>
      </div>

      {actionError && <p className="error-text">{actionError}</p>}

      <div className="tabs">
        <button className={tab === 'questoes' ? 'tab active' : 'tab'} onClick={() => setTab('questoes')}>
          Questões
        </button>
        <button className={tab === 'importar' ? 'tab active' : 'tab'} onClick={() => setTab('importar')}>
          Importar / Exportar
        </button>
        <button className={tab === 'resultados' ? 'tab active' : 'tab'} onClick={() => setTab('resultados')}>
          Resultados
        </button>
      </div>

      {tab === 'questoes' && (
        <div className="admin__grid">
          <div className="admin__list">
            <button className="btn btn--primary" onClick={startNew}>+ Nova questão</button>
            <ul>
              {questions.map((q, i) => (
                <li key={q.id} className={editingId === q.id ? 'selected' : ''}>
                  <span onClick={() => startEdit(q)}>{i + 1}. {q.title || '(sem título)'}</span>
                  <div className="row-actions">
                    <button title="Mover para cima" onClick={() => moveQuestion(i, -1)}>↑</button>
                    <button title="Mover para baixo" onClick={() => moveQuestion(i, 1)}>↓</button>
                    <button title="Remover" onClick={() => removeQuestion(q.id)}>✕</button>
                  </div>
                </li>
              ))}
              {questions.length === 0 && <li className="muted-item">Nenhuma questão cadastrada ainda.</li>}
            </ul>
          </div>

          <div className="admin__editor">
            {!draft && <p className="muted">Selecione uma questão à esquerda ou crie uma nova.</p>}
            {draft && (
              <>
                <label className="field">
                  <span>Título</span>
                  <input
                    type="text"
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Enunciado</span>
                  <textarea
                    rows={4}
                    value={draft.statement}
                    onChange={(e) => setDraft({ ...draft, statement: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Código inicial (opcional, aparece pronto no editor do aluno)</span>
                  <textarea
                    rows={3}
                    className="mono"
                    value={draft.starterCode}
                    onChange={(e) => setDraft({ ...draft, starterCode: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>
                    Casos de teste (JSON) — cada caso pode recriar arquivos e/ou entradas de input()
                    diferentes; o mesmo código do aluno roda contra todos eles.
                  </span>
                  <textarea
                    rows={12}
                    className="mono"
                    value={testCasesText}
                    onChange={(e) => setTestCasesText(e.target.value)}
                    placeholder={EXAMPLE_TESTCASES}
                  />
                </label>
                {jsonError && <p className="error-text">{jsonError}</p>}
                <div className="actions">
                  <button className="btn btn--ghost" onClick={cancelEdit}>Cancelar</button>
                  <button className="btn btn--primary" onClick={saveDraft} disabled={saving}>
                    {saving ? 'Salvando…' : 'Salvar questão'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'importar' && (
        <div className="paper-card">
          <p>Exporte o banco de questões atual para compartilhar com outro professor ou fazer backup.</p>
          <div className="actions">
            <button className="btn btn--primary" onClick={exportJSON}>Exportar questões (.json)</button>
          </div>
          <hr />
          <p>Importe um arquivo .json de questões (isso substitui o banco atual no MySQL).</p>
          <div className="actions">
            <input ref={fileInputRef} type="file" accept="application/json" onChange={importJSON} />
          </div>
        </div>
      )}

      {tab === 'resultados' && (
        <div className="paper-card">
          <div className="actions" style={{ justifyContent: 'space-between' }}>
            <p className="muted">
              {loadingResults ? 'Carregando…' : `${results.length} tentativa(s) registrada(s) no banco.`}
            </p>
            <button className="btn btn--ghost" onClick={handleClearResults}>Limpar resultados</button>
          </div>
          <table className="results-table">
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Nota</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i}>
                  <td>{r.studentName}</td>
                  <td>{r.score} / {r.total}</td>
                  <td>{new Date(r.finishedAt).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
              {!loadingResults && results.length === 0 && (
                <tr><td colSpan={3} className="muted-item">Nenhum resultado ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
