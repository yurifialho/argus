export function newId(prefix = 'q') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
