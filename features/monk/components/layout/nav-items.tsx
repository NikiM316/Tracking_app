import {
  BottomNavIcon,
  type BottomNavItem,
} from "@/features/core/components/BottomNav";

export const MONK_NAV_ITEMS: BottomNavItem[] = [
  {
    href: "/monk",
    label: "Today",
    exact: true,
    icon: (
      <BottomNavIcon>
        <path
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </BottomNavIcon>
    ),
  },
  {
    href: "/monk/challenge",
    label: "Challenge",
    icon: (
      <BottomNavIcon>
        <path
          d="M4 5h16M4 12h10M4 19h7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </BottomNavIcon>
    ),
  },
  {
    href: "/monk/habits",
    label: "Habits",
    icon: (
      <BottomNavIcon>
        <path
          d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </BottomNavIcon>
    ),
  },
];
