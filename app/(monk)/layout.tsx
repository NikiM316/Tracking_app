import { AppShell } from "@/features/monk/components/layout/AppShell";

export default function MonkLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppShell>{children}</AppShell>;
}
