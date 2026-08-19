// Avalia um único caso de teste: roda as "assertions" configuradas pelo professor
// contra a saída (stdout/stderr) que o código do aluno produziu.
export function evaluateAssertions(output, assertions = []) {
  const out = output ?? ''

  const results = assertions.map((a) => {
    let pass = false
    try {
      if (a.type === 'exact') {
        pass = out.trim() === (a.value ?? '').trim()
      } else if (a.type === 'regex') {
        pass = new RegExp(a.value, 'm').test(out)
      } else {
        // 'contains' é o padrão
        pass = out.includes(a.value ?? '')
      }
    } catch (e) {
      pass = false
    }
    return { ...a, pass }
  })

  const allPass = results.length > 0 && results.every((r) => r.pass)
  return { allPass, results }
}
