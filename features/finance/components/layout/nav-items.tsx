import {
  BottomNavIcon,
  type BottomNavItem,
} from "@/features/core/components/BottomNav";

export const FINANCE_NAV_ITEMS: BottomNavItem[] = [
  {
    href: "/finance",
    label: "Dashboard",
    icon: (
      <BottomNavIcon>
        <path
          d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v9a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 14a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1v-5z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </BottomNavIcon>
    ),
  },
];
