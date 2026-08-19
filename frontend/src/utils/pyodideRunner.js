// Carrega o Pyodide (Python compilado para WebAssembly) uma única vez
// e reaproveita a mesma instância para todas as execuções.

let pyodideInstance = null
let pyodideLoadingPromise = null

const WORK_DIR = '/home/pyodide'

export function isPyodideReady() {
  return pyodideInstance !== null
}

export function getPyodide(onStatus) {
  if (pyodideInstance) return Promise.resolve(pyodideInstance)

  if (!pyodideLoadingPromise) {
    if (typeof window.loadPyodide !== 'function') {
      return Promise.reject(
        new Error(
          'O Pyodide não carregou. Verifique sua conexão com a internet ' +
            '(o ambiente Python é baixado de um CDN na primeira execução).'
        )
      )
    }
    onStatus?.('Carregando ambiente Python (Pyodide)...')
    pyodideLoadingPromise = window
      .loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'
      })
      .then((pyodide) => {
        pyodideInstance = pyodide
        onStatus?.('Ambiente Python pronto.')
        return pyodide
      })
      .catch((err) => {
        pyodideLoadingPromise = null
        throw err
      })
  }
  return pyodideLoadingPromise
}

function writeVirtualFiles(pyodide, files) {
  for (const f of files || []) {
    try {
      pyodide.FS.writeFile(`${WORK_DIR}/${f.name}`, f.content ?? '')
    } catch (e) {
      console.error('Falha ao criar arquivo virtual', f.name, e)
    }
  }
}

function cleanupVirtualFiles(pyodide, files) {
  for (const f of files || []) {
    try {
      pyodide.FS.unlink(`${WORK_DIR}/${f.name}`)
    } catch (e) {
      // arquivo pode não ter sido criado ou já ter sido apagado pelo próprio código do aluno
    }
  }
}

/**
 * Executa o código Python do aluno dentro de um caso de teste específico.
 * Retorna { output, error }.
 *  - output: tudo que foi impresso em stdout/stderr durante a execução
 *  - error:  mensagem de erro do Python (SyntaxError, exceções, etc.), ou null
 */
export async function runPythonCode(code, testCase = {}, onStatus) {
  const pyodide = await getPyodide(onStatus)
  const { files = [], stdinInputs = [] } = testCase

  let output = ''
  pyodide.setStdout({ batched: (msg) => { output += msg + '\n' } })
  pyodide.setStderr({ batched: (msg) => { output += msg + '\n' } })

  writeVirtualFiles(pyodide, files)

  let errorMsg = null

  const setupCode = `
import builtins, os, json

os.makedirs("${WORK_DIR}", exist_ok=True)
os.chdir("${WORK_DIR}")

__input_queue = json.loads(${JSON.stringify(JSON.stringify(stdinInputs))})
__input_iter = iter(__input_queue)

def __fake_input(prompt=""):
    try:
        return next(__input_iter)
    except StopIteration:
        return ""

builtins.input = __fake_input
`

  try {
    await pyodide.runPythonAsync(setupCode)
    await pyodide.runPythonAsync(code)
  } catch (e) {
    errorMsg = cleanPythonError(e?.message || String(e))
  } finally {
    cleanupVirtualFiles(pyodide, files)
    pyodide.setStdout({})
    pyodide.setStderr({})
  }

  return { output: output.trimEnd(), error: errorMsg }
}

// O Pyodide devolve um traceback completo do interpretador embutido;
// mostramos só a parte relevante (a última linha costuma trazer o tipo/mensagem do erro).
function cleanPythonError(rawMessage) {
  const lines = rawMessage.trim().split('\n')
  const relevant = lines.filter(
    (l) => !l.includes('File "<exec>"') && !l.includes('PythonError')
  )
  return (relevant.length ? relevant : lines).join('\n').trim()
}
