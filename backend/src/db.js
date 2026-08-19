import mysql from 'mysql2/promise'

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'mysql',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'prova_app',
  password: process.env.DB_PASSWORD || 'prova_app_password',
  database: process.env.DB_NAME || 'prova_python',
  waitForConnections: true,
  connectionLimit: 10
})
