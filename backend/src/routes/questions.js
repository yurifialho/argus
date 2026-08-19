import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()

function rowToQuestion(row) {
  const testCases = row.test_cases
    ? typeof row.test_cases === 'string'
      ? JSON.parse(row.test_cases)
      : row.test_cases
    : []
  return {
    id: row.id,
    title: row.title,
    statement: row.statement,
    starterCode: row.starter_code,
    testCases
  }
}

// Público: o aluno precisa carregar as questões para fazer a prova.
router.get('/', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM questions ORDER BY position ASC, created_at ASC')
  res.json(rows.map(rowToQuestion))
})

// Protegido: o professor substitui o banco de questões inteiro.
// O painel do professor sempre envia a lista completa (criar/editar/reordenar/
// remover/importar), então regravar tudo dentro de uma transação é a forma
// mais simples e segura de manter tudo consistente.
router.put('/', requireAuth, async (req, res) => {
  const questions = req.body

  if (!Array.isArray(questions)) {
    return res.status(400).json({ error: 'O corpo da requisição precisa ser uma lista de questões.' })
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query('DELETE FROM questions')

    let position = 0
    for (const q of questions) {
      if (!q.id) continue
      await conn.query(
        'INSERT INTO questions (id, title, statement, starter_code, test_cases, position) VALUES (?, ?, ?, ?, ?, ?)',
        [
          q.id,
          q.title || '',
          q.statement || '',
          q.starterCode || '',
          JSON.stringify(q.testCases || []),
          position++
        ]
      )
    }

    await conn.commit()
    res.json({ ok: true })
  } catch (e) {
    await conn.rollback()
    res.status(500).json({ error: 'Erro ao salvar questões: ' + e.message })
  } finally {
    conn.release()
  }
})

export default router
