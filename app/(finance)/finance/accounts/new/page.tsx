import { NewAccountForm } from "@/features/finance/components/forms/NewAccountForm";

export const dynamic = "force-dynamic";

export default function NewAccountPage() {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-lg font-semibold text-zinc-50">Add Account</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Create a checking, savings, cash, or other account to track balances.
        </p>
        <div className="mt-5">
          <NewAccountForm />
        </div>
      </div>
    </section>
  );
}
