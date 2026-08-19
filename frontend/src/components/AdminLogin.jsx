import { useState } from 'react'
import { apiLogin, setSession } from '../utils/api.js'

export default function AdminLogin({ onLoggedIn, onExit }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token, username: name } = await apiLogin(username.trim(), password)
      setSession(token, name)
      onLoggedIn(token, name)
    } catch (err) {
      setError(err.message || 'Não foi possível entrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="paper-card intro-card" onSubmit={handleSubmit}>
      <span className="eyebrow">Área do professor</span>
      <h2>Entrar</h2>
      <p className="muted">Use o usuário e senha cadastrados para gerenciar questões e ver resultados.</p>

      <label className="field">
        <span>Usuário</span>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          autoComplete="username"
        />
      </label>
      <label className="field">
        <span>Senha</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </label>

      {error && <p className="error-text">{error}</p>}

      <div className="actions">
        <button type="button" className="btn btn--ghost" onClick={onExit}>Voltar</button>
        <button type="submit" className="btn btn--primary" disabled={loading || !username || !password}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </div>
    </form>
  )
}
