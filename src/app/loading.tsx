export default function Carregando() {
  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-6">
      <div className="mb-4 h-10 w-56 animate-pulse rounded-lg bg-muted" />
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/70" />
        ))}
      </div>
    </div>
  )
}
