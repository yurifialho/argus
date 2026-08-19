import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()

// Público: o aluno envia o resultado ao finalizar a prova.
router.post('/', async (req, res) => {
  const { studentName, score, total, detail } = req.body || {}

  if (!studentName || typeof score !== 'number' || typeof total !== 'number') {
    return res.status(400).json({ error: 'Dados de resultado incompletos.' })
  }

  await pool.query(
    'INSERT INTO results (student_name, score, total, detail) VALUES (?, ?, ?, ?)',
    [studentName, score, total, JSON.stringify(detail || [])]
  )

  res.status(201).json({ ok: true })
})

// Protegido: o professor vê todas as tentativas registradas.
router.get('/', requireAuth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM results ORDER BY finished_at DESC')
  res.json(
    rows.map((r) => ({
      studentName: r.student_name,
      score: r.score,
      total: r.total,
      finishedAt: r.finished_at,
      detail: typeof r.detail === 'string' ? JSON.parse(r.detail) : r.detail
    }))
  )
})

// Protegido: limpar todos os resultados.
router.delete('/', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM results')
  res.json({ ok: true })
})

export default router
