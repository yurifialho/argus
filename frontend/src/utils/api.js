// Cliente simples para falar com o backend (Node/Express + MySQL).
// Em desenvolvimento (docker-compose --profile dev), configure VITE_API_URL
// no ambiente do serviço "dev" apontando para http://localhost:4000/api.
// Em produção, o Nginx do frontend faz proxy de /api para o backend, então
// o valor padrão relativo ("/api") já funciona sem configuração extra.

const API_URL = import.meta.env.VITE_API_URL || '/api'
const TOKEN_KEY = 'prova-python:token'
const TEACHER_KEY = 'prova-python:teacherName'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getTeacherName() {
  return localStorage.getItem(TEACHER_KEY) || ''
}

export function setSession(token, username) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(TEACHER_KEY, username)
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TEACHER_KEY)
}

class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers })
  } catch (e) {
    throw new ApiError('Não foi possível conectar ao servidor. Verifique se o backend está no ar.', 0)
  }

  if (!res.ok) {
    let message = `Erro ${res.status} ao falar com o servidor.`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch (e) {
      // resposta sem corpo JSON, mantém mensagem genérica
    }
    throw new ApiError(message, res.status)
  }

  if (res.status === 204) return null
  return res.json()
}

export function apiLogin(username, password) {
  return request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
}

export function fetchQuestions() {
  return request('/questions')
}

export function replaceQuestions(questions) {
  return request('/questions', { method: 'PUT', body: JSON.stringify(questions) })
}

export function submitResult(result) {
  return request('/results', { method: 'POST', body: JSON.stringify(result) })
}

export function fetchResults() {
  return request('/results')
}

export function clearResultsApi() {
  return request('/results', { method: 'DELETE' })
}
