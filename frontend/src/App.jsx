import { useEffect, useState } from 'react'
import StudentView from './components/StudentView.jsx'
import AdminView from './components/AdminView.jsx'
import AdminLogin from './components/AdminLogin.jsx'
import { fetchQuestions, getToken, getTeacherName, clearSession } from './utils/api.js'
import logo from './asserts/argus_logo_wb.png'

export default function App() {
  const [mode, setMode] = useState('home') // home | student | admin
  const [questions, setQuestions] = useState([])
  const [loadingQuestions, setLoadingQuestions] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [teacherToken, setTeacherToken] = useState(() => getToken())
  const [teacherName, setTeacherName] = useState(() => getTeacherName())

  useEffect(() => {
    reloadQuestions()
  }, [])

  async function reloadQuestions() {
    setLoadingQuestions(true)
    setLoadError('')
    try {
      const data = await fetchQuestions()
      setQuestions(data)
    } catch (e) {
      setLoadError(e.message || 'Não foi possível carregar as questões do servidor.')
    } finally {
      setLoadingQuestions(false)
    }
  }

  function handleLoggedIn(token, username) {
    setTeacherToken(token)
    setTeacherName(username)
  }

  function handleLogout() {
    clearSession()
    setTeacherToken(null)
    setTeacherName('')
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__mark">
            <img src={logo} alt='Logo' />
          </span>
          <div>
            <h1>Argus</h1>
            <p>Sistema de Avaliação Prática de Python</p>
          </div>
        </div>
        {mode !== 'home' && (
          <button className="btn btn--ghost" onClick={() => setMode('home')}>
            Início
          </button>
        )}
        {mode === 'home' && (
          <button className="btn btn--ghost" onClick={() => setMode('admin')}>
              Gerenciar
          </button>
        )}
      </header>

      <main className="app-main">
        {mode === 'home' && (
          <div className="home-grid">
            <button className="role-card role-card--dark" onClick={() => setMode('student')}>
              <span className="eyebrow">Sou aluno</span>
              <h2>Fazer a prova</h2>
              <p>Resolva as questões.</p>
            </button>
          </div>
        )}

        {mode === 'student' && (
          <>
            {loadingQuestions && <p className="loading-msg">Carregando questões…</p>}
            {!loadingQuestions && loadError && (
              <div className="paper-card">
                <p className="error-text">{loadError}</p>
                <div className="actions">
                  <button className="btn btn--ghost" onClick={() => setMode('home')}>Voltar</button>
                  <button className="btn btn--primary" onClick={reloadQuestions}>Tentar novamente</button>
                </div>
              </div>
            )}
            {!loadingQuestions && !loadError && (
              <StudentView questions={questions} onExit={() => setMode('home')} />
            )}
          </>
        )}

        {mode === 'admin' && (
          teacherToken ? (
            <AdminView
              questions={questions}
              onQuestionsReload={reloadQuestions}
              teacherName={teacherName}
              onLogout={handleLogout}
              onExit={() => setMode('home')}
            />
          ) : (
            <AdminLogin onLoggedIn={handleLoggedIn} onExit={() => setMode('home')} />
          )
        )}
      </main>

      <footer className="app-footer">
        Yuri Fialho - 2026 - Copyright
      </footer>
    </div>
  )
}
