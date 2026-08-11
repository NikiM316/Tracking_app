import { NewPortfolioForm } from "@/features/finance/components/forms/NewPortfolioForm";

export const dynamic = "force-dynamic";

export default function NewPortfolioPage() {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-lg font-semibold text-zinc-50">Add Portfolio</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Create a container for holdings — e.g. crypto wallet, brokerage, or pension.
        </p>
        <div className="mt-5">
          <NewPortfolioForm />
        </div>
      </div>
    </section>
  );
}
