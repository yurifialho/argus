// Questões de exemplo, inseridas automaticamente no MySQL quando a tabela
// "questions" está vazia (primeira inicialização do backend).
export const defaultQuestions = [
  {
    id: 'q1',
    title: 'Leitura de arquivo — 3ª linha',
    statement:
      'Crie um código Python que abra o arquivo "teste.txt" (ele já existe no ambiente de execução) ' +
      'e exiba na tela apenas o conteúdo da 3ª linha do arquivo.',
    starterCode:
      '# Dica: use open("teste.txt") e leia as linhas com readlines()\n' +
      '# ou percorra o arquivo com um for.\n\n',
    testCases: [
      {
        description: 'Arquivo de exemplo 1',
        files: [
          {
            name: 'teste.txt',
            content: 'primeira linha\nsegunda linha\nterceira linha\nquarta linha\nquinta linha\n'
          }
        ],
        stdinInputs: [],
        assertions: [{ type: 'contains', value: 'terceira linha' }]
      },
      {
        description: 'Arquivo de exemplo 2 (conteúdo diferente, mesmo código)',
        files: [
          {
            name: 'teste.txt',
            content: 'abacaxi\nbanana\ncereja\ndamasco\n'
          }
        ],
        stdinInputs: [],
        assertions: [{ type: 'contains', value: 'cereja' }]
      }
    ]
  },
  {
    id: 'q2',
    title: 'Soma de dois números',
    statement:
      'Crie um código Python que leia dois números inteiros digitados pelo usuário (um por vez, usando input()) ' +
      'e exiba a soma deles no formato: Soma: <resultado>',
    starterCode: '# Use input() duas vezes e converta para int com int()\n\n',
    testCases: [
      {
        description: 'Caso 1: 4 + 7',
        files: [],
        stdinInputs: ['4', '7'],
        assertions: [{ type: 'contains', value: 'Soma: 11' }]
      },
      {
        description: 'Caso 2: 10 + -3',
        files: [],
        stdinInputs: ['10', '-3'],
        assertions: [{ type: 'contains', value: 'Soma: 7' }]
      }
    ]
  },
  {
    id: 'q3',
    title: 'Contar linhas de um arquivo',
    statement:
      'Crie um código Python que abra o arquivo "dados.txt" (já existe no ambiente) e exiba quantas linhas ele possui, ' +
      'no formato: Total de linhas: <numero>',
    starterCode: '',
    testCases: [
      {
        description: 'Arquivo com 4 linhas',
        files: [{ name: 'dados.txt', content: 'a\nb\nc\nd\n' }],
        stdinInputs: [],
        assertions: [{ type: 'contains', value: 'Total de linhas: 4' }]
      },
      {
        description: 'Arquivo com 1 linha',
        files: [{ name: 'dados.txt', content: 'unica\n' }],
        stdinInputs: [],
        assertions: [{ type: 'contains', value: 'Total de linhas: 1' }]
      }
    ]
  }
]
