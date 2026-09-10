type AppShellProps = {
  children: React.ReactNode;
  header: React.ReactNode;
  nav: React.ReactNode;
};

export function AppShell({ children, header, nav }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-zinc-950 text-zinc-50">
      {header}
      <main
        className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-28 pt-6"
        style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom))" }}
      >
        {children}
      </main>
      {nav}
    </div>
  );
}
