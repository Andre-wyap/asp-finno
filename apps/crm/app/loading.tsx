export default function Loading() {
  return (
    <main className="min-h-screen bg-surface px-4 py-8 text-on-surface sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl animate-pulse">
        <div className="h-5 w-32 rounded bg-surface-container-high" />
        <div className="mt-6 h-10 w-72 rounded bg-surface-container-high" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <div className="h-64 rounded-lg bg-surface-container-lowest shadow-ambient" />
            <div className="h-52 rounded-lg bg-surface-container-lowest shadow-ambient" />
          </div>
          <div className="space-y-4">
            <div className="h-44 rounded-lg bg-surface-container-lowest shadow-ambient" />
            <div className="h-64 rounded-lg bg-surface-container-lowest shadow-ambient" />
          </div>
        </div>
      </div>
    </main>
  );
}
