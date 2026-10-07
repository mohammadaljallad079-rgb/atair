'use client';

import { ReactNode } from 'react';

const paths: Record<string, ReactNode> = {
  grid: <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />,
  pulse: <path d="M3 12h4l3 8 4-16 3 8h4" />,
  box: <><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="M3 8l9 5 9-5M12 13v8" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 21a6.5 6.5 0 0 1 13 0M16 4a3.5 3.5 0 0 1 0 7M22 21a6.5 6.5 0 0 0-5-6.3" /></>,
  route: <><circle cx="6" cy="19" r="2.5" /><circle cx="18" cy="5" r="2.5" /><path d="M8.5 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5" /></>,
  truck: <><path d="M3 6h11v9H3zM14 9h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></>,
  tag: <><path d="M20 12 12 4H4v8l8 8z" /><circle cx="7.5" cy="7.5" r="1.2" /></>,
  map: <path d="m9 4-6 2v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14" />,
  card: <><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="M2.5 10h19" /></>,
  wallet: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M16 12h3M3 9h13a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H3" /></>,
  store: <><path d="M4 4h16l-1 5H5zM5 9v11h14V9M9 20v-6h6v6" /></>,
  life: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.5" /><path d="m5 5 4 4M15 15l4 4M19 5l-4 4M9 15l-4 4" /></>,
  bell: <><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  shield: <><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z" /><path d="m9 12 2 2 4-4" /></>,
  id: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="M6 16c1-1.6 5-1.6 6 0M15 10h3M15 13h3" /></>,
  key: <><circle cx="8" cy="14" r="4" /><path d="m11 11 8-8M17 3l3 3M14 6l3 3" /></>,
  cog: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>,
  chart: <><path d="M4 20V4M4 20h16" /><path d="M8 20v-6M12 20v-10M16 20v-4" /></>,
};

export function Icon({ name, className = 'h-4 w-4' }: { name: string; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths[name] ?? paths.grid}
    </svg>
  );
}
