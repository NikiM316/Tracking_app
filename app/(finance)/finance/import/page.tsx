import { ImportCsvForm } from "@/features/finance/components/forms/ImportCsvForm";
import { getAccounts } from "@/features/finance/actions";

export const dynamic = "force-dynamic";

export default async function ImportTransactionsPage() {
  const accounts = await getAccounts();

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-lg font-semibold text-zinc-50">Import Statement</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Upload a CSV export from your bank (e.g. Revolut) to bulk-import transactions
          into an account.
        </p>
        <div className="mt-5">
          <ImportCsvForm accounts={accounts} />
        </div>
      </div>
    </section>
  );
}
