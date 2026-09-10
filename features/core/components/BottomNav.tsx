import type { ReactNode } from "react";

import { NavLink } from "@/features/core/components/NavLink";

export type BottomNavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
};

type BottomNavProps = {
  items: BottomNavItem[];
  ariaLabel: string;
};

export function BottomNavIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

export function BottomNav({ items, ariaLabel }: BottomNavProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex w-full max-w-md">
        {items.map((item) => (
          <NavLink key={item.href} href={item.href} exact={item.exact}>
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
