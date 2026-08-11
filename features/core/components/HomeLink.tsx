import Link from "next/link";

export function HomeLink() {
  return (
    <Link
      aria-label="Back to home"
      className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
      href="/"
    >
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        viewBox="0 0 24 24"
      >
        <path
          d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}
