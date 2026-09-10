import {
  BottomNavIcon,
  type BottomNavItem,
} from "@/features/core/components/BottomNav";

export const FITNESS_NAV_ITEMS: BottomNavItem[] = [
  {
    href: "/today",
    label: "Today",
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
    href: "/cycle",
    label: "Cycle",
    icon: (
      <BottomNavIcon>
        <path
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </BottomNavIcon>
    ),
  },
  {
    href: "/history",
    label: "History",
    icon: (
      <BottomNavIcon>
        <path
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </BottomNavIcon>
    ),
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: (
      <BottomNavIcon>
        <path
          d="M4 20V10m6 10V4m6 16v-7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </BottomNavIcon>
    ),
  },
];
