import Link from "next/link";

export default function Home() {
  return (
    <main
      className="flex min-h-dvh flex-col bg-zinc-950 text-zinc-50"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-10 pt-10">
        <header className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
            Welcome
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-50">
            Choose a tracker
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Pick a module to get started. You can return here anytime from the Home
            button in the header.
          </p>
        </header>

        <div className="flex flex-col gap-4">
          <Link
            className="flex min-h-28 flex-col justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 transition-colors hover:border-emerald-500/40 hover:bg-zinc-900"
            href="/today"
          >
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
              Fitness
            </span>
            <span className="mt-2 text-2xl font-bold tracking-tight text-zinc-50">
              Gym Tracker
            </span>
            <span className="mt-1 text-sm text-zinc-400">
              Log workouts, follow the cycle, and track progress
            </span>
          </Link>

          <Link
            className="flex min-h-28 flex-col justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 transition-colors hover:border-emerald-500/40 hover:bg-zinc-900"
            href="/finance"
          >
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
              Money
            </span>
            <span className="mt-2 text-2xl font-bold tracking-tight text-zinc-50">
              Finance Tracker
            </span>
            <span className="mt-1 text-sm text-zinc-400">
              Track cashflow, balances, and investments
            </span>
          </Link>
          <Link
            className="flex min-h-28 flex-col justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 transition-colors hover:border-emerald-500/40 hover:bg-zinc-900"
            href="/monk"
          >
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
              Discipline
            </span>
            <span className="mt-2 text-2xl font-bold tracking-tight text-zinc-50">
              Monk Mode
            </span>
            <span className="mt-1 text-sm text-zinc-400">
              180-day protocol, binary days, no quiet edits
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}
