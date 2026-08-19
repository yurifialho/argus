import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { pool } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'troque-este-segredo'

export async function login(req, res) {
  const { username, password } = req.body || {}

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' })
  }

  const [rows] = await pool.query('SELECT * FROM teachers WHERE username = ?', [username])
  const teacher = rows[0]

  if (!teacher) {
    return res.status(401).json({ error: 'Usuário ou senha inválidos.' })
  }

  const valid = await bcrypt.compare(password, teacher.password_hash)
  if (!valid) {
    return res.status(401).json({ error: 'Usuário ou senha inválidos.' })
  }

  const token = jwt.sign({ sub: teacher.id, username: teacher.username }, JWT_SECRET, {
    expiresIn: '8h'
  })

  res.json({ token, username: teacher.username })
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Não autenticado.' })
  }

  try {
    req.teacher = jwt.verify(token, JWT_SECRET)
    next()
  } catch (e) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' })
  }
}
