# Prova Prática de Python

Sistema para aplicar provas práticas de Python: o aluno escreve o código
**dentro do próprio navegador** (só digitando — colar está desabilitado) e o
sistema **executa o Python de verdade** (via [Pyodide](https://pyodide.org),
Python compilado para WebAssembly) para conferir se a resposta está correta.
Questões e resultados ficam salvos em **MySQL**, e o painel do professor é
protegido por **usuário e senha**.

## Arquitetura

```
frontend/   -> React + Vite (interface do aluno e do professor)
backend/    -> API Node/Express (autenticação, questões, resultados)
mysql       -> banco de dados (via imagem oficial no docker-compose)
```

O frontend nunca fala com o MySQL diretamente — tudo passa pela API do
backend, que valida o login do professor (JWT) antes de permitir criar,
editar ou remover questões e ver resultados.

## Rodando com Docker (recomendado)

Pré-requisito: Docker e Docker Compose.

1. Copie o arquivo de variáveis de ambiente e ajuste as senhas:

   ```bash
   cp .env.example .env
   ```

   Edite `.env` e defina principalmente `TEACHER_USERNAME`, `TEACHER_PASSWORD`
   e `JWT_SECRET` antes de usar em produção.

2. Suba os containers:

   ```bash
   docker compose up --build
   ```

3. Acesse:
   - Aplicação (aluno/professor): [http://localhost:8080](http://localhost:8080)
   - API (opcional, para debug): [http://localhost:4000/api/health](http://localhost:4000/api/health)

Na primeira subida, o backend cria automaticamente:
- o usuário do professor definido em `TEACHER_USERNAME` / `TEACHER_PASSWORD`;
- 3 questões de exemplo (incluindo a de ler a 3ª linha de um arquivo).

Para derrubar tudo:

```bash
docker compose down          # mantém os dados do MySQL
docker compose down -v       # remove também o volume do MySQL (apaga tudo)
```

### Modo desenvolvimento (hot-reload do frontend)

```bash
docker compose --profile dev up dev
```

Isso sobe `mysql` + `backend` normalmente e o frontend em modo Vite dev
server (com recarregamento automático) em
[http://localhost:5173](http://localhost:5173), falando com o backend em
`http://localhost:4000`.

> A internet ainda é necessária **no navegador de quem acessa a aplicação**
> (aluno/professor), pois o Pyodide é baixado de um CDN pelo navegador na
> primeira execução de código. Isso independe dos containers.

## Login do professor

A tela inicial tem duas opções: "Sou aluno" (não exige login) e "Sou
professor" (pede usuário e senha). As credenciais padrão, se você não mudar
o `.env`, são:

```
usuário: professor
senha:   troque-esta-senha
```

**Troque isso antes de usar de verdade.** Como a criação do usuário só
acontece se a tabela `teachers` estiver vazia, para trocar a senha depois de
já ter subido o projeto uma vez, você tem duas opções:
- apagar o volume do MySQL (`docker compose down -v`) e subir de novo com as
  novas variáveis no `.env`; ou
- conectar direto no MySQL e fazer o update manualmente (ver seção abaixo).

### Trocar a senha do professor manualmente (sem apagar dados)

```bash
docker compose exec backend node -e "
const bcrypt = require('bcryptjs');
bcrypt.hash(process.argv[1], 10).then(console.log);
" "nova-senha-aqui"
```

Copie o hash gerado e rode no MySQL:

```bash
docker compose exec mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" \
  -e "UPDATE teachers SET password_hash='COLE_O_HASH_AQUI' WHERE username='professor';"
```

## Rodando sem Docker (desenvolvimento manual)

Pré-requisitos: Node.js 18+ e um MySQL acessível.

**Backend:**
```bash
cd backend
cp .env.example .env   # ajuste DB_HOST/usuário/senha para o seu MySQL
npm install
npm run dev
```

**Frontend** (em outro terminal):
```bash
cd frontend
npm install
VITE_API_URL=http://localhost:4000/api npm run dev
```

## Como funciona a correção do código

Cada questão tem um ou mais **casos de teste**. Cada caso pode:

- criar arquivos virtuais no ambiente (ex: `teste.txt` com um conteúdo
  específico) antes de rodar o código do aluno;
- fornecer uma lista de valores que serão devolvidos por `input()`, na
  ordem chamada;
- definir **assertions**: regras que a saída (tudo que o código imprimiu)
  precisa satisfazer. Tipos suportados:
  - `contains`: a saída precisa conter esse texto;
  - `exact`: a saída precisa ser exatamente igual (ignorando espaços nas
    pontas);
  - `regex`: a saída precisa casar com essa expressão regular.

O sistema roda o **mesmo código do aluno** contra todos os casos de teste de
uma questão — isso ajuda a evitar que o aluno "chute" uma resposta fixa (ex:
`print("terceira linha")` sem realmente ler o arquivo). Por isso as questões
de exemplo já vêm com 2 casos usando arquivos diferentes.

Exemplo (a questão de ler a 3ª linha de um arquivo):

```json
{
  "title": "Leitura de arquivo — 3ª linha",
  "statement": "Crie um código Python que abra o arquivo teste.txt e exiba a 3ª linha.",
  "testCases": [
    {
      "description": "Arquivo de exemplo",
      "files": [{ "name": "teste.txt", "content": "linha 1\nlinha 2\nlinha 3\n" }],
      "stdinInputs": [],
      "assertions": [{ "type": "contains", "value": "linha 3" }]
    }
  ]
}
```

## Sobre o bloqueio de colar

No editor de código do aluno, colar (`Ctrl+V`, clique direito > colar, ou
arrastar texto/arquivo para dentro do editor) é bloqueado — o aluno só
consegue digitar. Isso é feito interceptando os eventos `paste` e `drop` do
navegador. É uma trava razoável para desincentivar copiar e colar de fora,
mas, como qualquer trava só no front-end, um usuário com conhecimento técnico
avançado (ex: editando o DOM via ferramentas de desenvolvedor do navegador)
poderia contorná-la — não trate isso como um mecanismo de prova de fraude à
prova de tudo, e sim como um obstáculo prático para o caso comum.

## Painel do professor

Depois de logado, o professor pode:

- **Questões**: criar, editar, reordenar e remover questões. Os campos
  título/enunciado/código inicial têm formulário próprio; os *casos de
  teste* são editados como JSON (copie o exemplo que aparece como
  placeholder para começar rápido).
- **Importar/Exportar**: baixar o banco de questões atual como `.json`
  (backup ou para compartilhar com outro professor) e importar um `.json`
  de questões (substitui o banco atual no MySQL).
- **Resultados**: lista de tentativas registradas pelos alunos, com nome,
  nota e data, vindas diretamente do MySQL.

## Limitações importantes

- A verificação compara a **saída impressa** do código (stdout/stderr), não
  o código-fonte em si. Isso é intencional (permite múltiplas soluções
  corretas), mas significa que um código que produza a saída certa "por
  acaso" também passaria — por isso é importante usar mais de um caso de
  teste por questão, como nos exemplos.
- `input()` é suportado via uma fila de valores pré-definidos pelo
  professor (`stdinInputs`), não interação manual durante a correção.
- Não há confirmação de e-mail nem recuperação de senha para o professor;
  é um login simples (usuário/senha) pensado para uso interno/sala de aula.

## Estrutura do projeto

```
docker-compose.yml
.env.example

backend/
  init.sql                  -> schema do MySQL (teachers, questions, results)
  src/index.js              -> sobe a API, cria professor/questões padrão
  src/db.js                 -> pool de conexão MySQL
  src/auth.js               -> login (JWT) e middleware de autenticação
  src/routes/questions.js   -> GET público, PUT protegido (professor)
  src/routes/results.js     -> POST público (aluno), GET/DELETE protegidos

frontend/
  src/utils/api.js          -> cliente HTTP (fetch) para a API
  src/utils/pyodideRunner.js-> executa o código do aluno no navegador
  src/utils/checkAnswer.js  -> compara saída x assertions
  src/components/
    CodeEditor.jsx          -> editor com numeração de linhas e sem colar
    StudentView.jsx         -> fluxo do aluno
    AdminLogin.jsx          -> login do professor
    AdminView.jsx           -> painel do professor
    GradeStamp.jsx          -> selo visual de aprovado/revisar
```
