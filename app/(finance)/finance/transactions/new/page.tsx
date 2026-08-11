import { NewTransactionForm } from "@/features/finance/components/forms/NewTransactionForm";
import { getAccounts, getCategories } from "@/features/finance/actions";

export const dynamic = "force-dynamic";

export default async function NewTransactionPage() {
  const [accounts, categories] = await Promise.all([getAccounts(), getCategories()]);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-lg font-semibold text-zinc-50">New Transaction</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Log an expense, income, or transfer between accounts.
        </p>
        <div className="mt-5">
          <NewTransactionForm accounts={accounts} categories={categories} />
        </div>
      </div>
    </section>
  );
}
