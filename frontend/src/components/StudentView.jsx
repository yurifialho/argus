import { useState, useMemo } from 'react'
import CodeEditor from './CodeEditor.jsx'
import GradeStamp from './GradeStamp.jsx'
import { runPythonCode } from '../utils/pyodideRunner.js'
import { evaluateAssertions } from '../utils/checkAnswer.js'
import { submitResult } from '../utils/api.js'

export default function StudentView({ questions, onExit }) {
  const [stage, setStage] = useState('intro') // intro | exam | summary
  const [studentName, setStudentName] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({}) // { [questionId]: { code, checked, allPass, cases: [...] } }
  const [running, setRunning] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const question = questions[currentIndex]
  const currentAnswer = answers[question?.id]

  const progressLabel = `Questão ${currentIndex + 1} de ${questions.length}`

  function updateCode(code) {
    setAnswers((prev) => ({
      ...prev,
      [question.id]: { ...prev[question.id], code, checked: false, cases: [] }
    }))
  }

  async function handleRun() {
    setRunning(true)
    setStatusMsg('')
    const code = currentAnswer?.code ?? question.starterCode ?? ''

    const caseResults = []
    for (const testCase of question.testCases) {
      const { output, error } = await runPythonCode(code, testCase, setStatusMsg)
      const { allPass, results } = error
        ? { allPass: false, results: [] }
        : evaluateAssertions(output, testCase.assertions)
      caseResults.push({
        description: testCase.description,
        output,
        error,
        allPass,
        assertionResults: results
      })
    }

    const allPass = caseResults.length > 0 && caseResults.every((c) => c.allPass)

    setAnswers((prev) => ({
      ...prev,
      [question.id]: { code, checked: true, allPass, cases: caseResults }
    }))
    setRunning(false)
    setStatusMsg('')
  }

  function goTo(index) {
    setCurrentIndex(Math.max(0, Math.min(questions.length - 1, index)))
  }

  async function finishExam() {
    const detail = questions.map((q) => ({
      questionId: q.id,
      title: q.title,
      attempted: !!answers[q.id]?.checked,
      allPass: !!answers[q.id]?.allPass,
      code: answers[q.id]?.code ?? ''
    }))
    const score = detail.filter((d) => d.allPass).length

    setSubmitError('')
    setSubmitting(true)
    try {
      await submitResult({
        studentName: studentName.trim() || 'Aluno sem nome',
        score,
        total: questions.length,
        detail
      })
    } catch (e) {
      setSubmitError(
        'Não foi possível enviar o resultado ao servidor (' + e.message + '). ' +
          'Baixe o relatório para não perder sua prova e avise o professor.'
      )
    } finally {
      setSubmitting(false)
      setStage('summary')
    }
  }

  function downloadReport() {
    const detail = questions.map((q, i) => {
      const a = answers[q.id]
      return (
        `Questão ${i + 1}: ${q.title}\n` +
        `Status: ${a?.allPass ? 'APROVADO' : a?.checked ? 'REVISAR' : 'NÃO EXECUTADO'}\n` +
        `Código enviado:\n${a?.code ?? '(vazio)'}\n` +
        '-----------------------------------\n'
      )
    })
    const score = questions.filter((q) => answers[q.id]?.allPass).length
    const text =
      `Relatório de Prova Prática de Python\n` +
      `Aluno: ${studentName.trim() || 'Aluno sem nome'}\n` +
      `Data: ${new Date().toLocaleString('pt-BR')}\n` +
      `Nota: ${score} / ${questions.length}\n\n` +
      detail.join('\n')

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-${(studentName.trim() || 'aluno').replace(/\s+/g, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const scoreSoFar = useMemo(
    () => questions.filter((q) => answers[q.id]?.allPass).length,
    [answers, questions]
  )

  if (questions.length === 0) {
    return (
      <div className="empty-state">
        <p>Ainda não há questões cadastradas. Peça ao professor para cadastrar questões no painel do professor.</p>
        <button className="btn btn--ghost" onClick={onExit}>Voltar</button>
      </div>
    )
  }

  if (stage === 'intro') {
    return (
      <div className="paper-card intro-card">
        <span className="eyebrow">Prova prática · Python</span>
        <h2>Identifique-se para começar</h2>
        <p className="muted">
          Você vai resolver {questions.length} questão(ões) escrevendo código Python real, executado
          diretamente no navegador. Cada questão pode ser testada quantas vezes quiser antes de avançar.
        </p>
        <label className="field">
          <span>Nome do aluno</span>
          <input
            type="text"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="Digite seu nome completo"
          />
        </label>
        <div className="actions">
          <button className="btn btn--ghost" onClick={onExit}>Voltar</button>
          <button
            className="btn btn--primary"
            disabled={!studentName.trim()}
            onClick={() => setStage('exam')}
          >
            Iniciar prova
          </button>
        </div>
      </div>
    )
  }

  if (stage === 'summary') {
    const score = questions.filter((q) => answers[q.id]?.allPass).length
    return (
      <div className="paper-card summary-card">
        <span className="eyebrow">Resultado final</span>
        <h2>{studentName.trim() || 'Aluno'}, sua prova foi encerrada</h2>
        <p className="score-big">{score} / {questions.length}</p>
        {submitError && <p className="error-text">{submitError}</p>}
        <ul className="summary-list">
          {questions.map((q, i) => {
            const a = answers[q.id]
            return (
              <li key={q.id} className={a?.allPass ? 'ok' : a?.checked ? 'fail' : 'pending'}>
                <span>{i + 1}. {q.title}</span>
                <strong>{a?.allPass ? 'Aprovado' : a?.checked ? 'Revisar' : 'Não executado'}</strong>
              </li>
            )
          })}
        </ul>
        <div className="actions">
          <button className="btn btn--ghost" onClick={onExit}>Voltar ao início</button>
          <button className="btn btn--primary" onClick={downloadReport}>Baixar relatório</button>
        </div>
      </div>
    )
  }

  // stage === 'exam'
  return (
    <div className="exam-layout">
      <div className="paper-card question-card">
        <div className="question-card__header">
          <span className="eyebrow">{progressLabel}</span>
          <span className="score-pill">Corretas até agora: {scoreSoFar}</span>
        </div>
        <h2>{question.title}</h2>
        <p className="statement">{question.statement}</p>

        {currentAnswer?.checked && <GradeStamp status={currentAnswer.allPass ? 'correct' : 'incorrect'} />}

        <div className="actions actions--nav">
          <button className="btn btn--ghost" onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}>
            ← Anterior
          </button>
          {currentIndex < questions.length - 1 ? (
            <button className="btn btn--ghost" onClick={() => goTo(currentIndex + 1)}>
              Próxima →
            </button>
          ) : (
            <button className="btn btn--primary" onClick={finishExam} disabled={submitting}>
              {submitting ? 'Enviando…' : 'Finalizar prova'}
            </button>
          )}
        </div>
      </div>

      <div className="terminal-card">
        <div className="terminal-card__titlebar">
          <div className="dots"><span /><span /><span /></div>
          <span className="terminal-card__title">python3 — {studentName.trim() || 'aluno'}@prova</span>
        </div>

        <CodeEditor
          value={currentAnswer?.code ?? question.starterCode ?? ''}
          onChange={updateCode}
          disabled={running}
        />

        <div className="terminal-card__actions">
          <button className="btn btn--run" onClick={handleRun} disabled={running}>
            {running ? 'Executando…' : '▶ Executar e verificar'}
          </button>
          {statusMsg && <span className="status-msg">{statusMsg}</span>}
        </div>

        <div className="console">
          <div className="console__label">Saída</div>
          {!currentAnswer?.checked && (
            <div className="console__idle">Aguardando execução{<span className="blink">_</span>}</div>
          )}
          {currentAnswer?.checked &&
            currentAnswer.cases.map((c, idx) => (
              <div key={idx} className={`console__case ${c.allPass ? 'ok' : 'fail'}`}>
                <div className="console__case-title">
                  Caso {idx + 1}{c.description ? ` — ${c.description}` : ''}: {c.allPass ? 'OK' : 'Falhou'}
                </div>
                {c.error ? (
                  <pre className="console__pre console__pre--error">{c.error}</pre>
                ) : (
                  <pre className="console__pre">{c.output || '(sem saída)'}</pre>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
