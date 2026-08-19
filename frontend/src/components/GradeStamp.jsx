export default function GradeStamp({ status }) {
  // status: 'correct' | 'incorrect' | null
  if (!status) return null

  const isCorrect = status === 'correct'

  return (
    <div className={`stamp ${isCorrect ? 'stamp--ok' : 'stamp--fail'}`}>
      <span className="stamp__ring">
        <span className="stamp__text">{isCorrect ? 'APROVADO' : 'REVISAR'}</span>
      </span>
    </div>
  )
}
