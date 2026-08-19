import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'

import { pool } from './db.js'
import { login } from './auth.js'
import questionsRouter from './routes/questions.js'
import resultsRouter from './routes/results.js'
import { defaultQuestions } from './defaultQuestions.js'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

app.post('/api/auth/login', login)
app.use('/api/questions', questionsRouter)
app.use('/api/results', resultsRouter)
app.get('/api/health', (req, res) => res.json({ ok: true }))

const PORT = process.env.PORT || 4000

async function waitForDb(retries = 30, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1')
      return
    } catch (e) {
      console.log(`Aguardando MySQL ficar disponível... (${i + 1}/${retries})`)
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  throw new Error('Não foi possível conectar ao MySQL depois de várias tentativas.')
}

async function ensureDefaultTeacher() {
  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM teachers')
  if (rows[0].count > 0) return

  const username = process.env.TEACHER_USERNAME || 'professor'
  const password = process.env.TEACHER_PASSWORD || 'troque-esta-senha'
  const hash = await bcrypt.hash(password, 10)

  await pool.query('INSERT INTO teachers (username, password_hash) VALUES (?, ?)', [username, hash])
  console.log(
    `Usuário do professor criado (usuário: "${username}"). ` +
      'Defina TEACHER_USERNAME e TEACHER_PASSWORD no .env antes de usar em produção.'
  )
}

async function ensureDefaultQuestions() {
  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM questions')
  if (rows[0].count > 0) return

  let position = 0
  for (const q of defaultQuestions) {
    await pool.query(
      'INSERT INTO questions (id, title, statement, starter_code, test_cases, position) VALUES (?, ?, ?, ?, ?, ?)',
      [q.id, q.title, q.statement, q.starterCode, JSON.stringify(q.testCases), position++]
    )
  }
  console.log(`${defaultQuestions.length} questão(ões) de exemplo criada(s).`)
}

waitForDb()
  .then(ensureDefaultTeacher)
  .then(ensureDefaultQuestions)
  .then(() => {
    app.listen(PORT, () => console.log(`API rodando em http://localhost:${PORT}`))
  })
  .catch((err) => {
    console.error('Falha ao iniciar o backend:', err)
    process.exit(1)
  })
