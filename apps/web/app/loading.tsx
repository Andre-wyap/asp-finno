export default function Loading() {
  return (
    <main className="min-h-screen bg-surface px-4 py-16 text-on-surface sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl animate-pulse">
        <div className="h-4 w-40 rounded bg-surface-container-high" />
        <div className="mt-5 h-12 w-full max-w-xl rounded bg-surface-container-high" />
        <div className="mt-4 h-5 w-full max-w-2xl rounded bg-surface-container-high" />
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="h-28 rounded-lg bg-surface-container-lowest shadow-ambient" />
          <div className="h-28 rounded-lg bg-surface-container-lowest shadow-ambient" />
          <div className="h-28 rounded-lg bg-surface-container-lowest shadow-ambient" />
        </div>
      </div>
    </main>
  );
}
