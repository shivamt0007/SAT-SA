import {
  LayoutDashboard,
  ClipboardCheck,
  BarChart3,
  ShieldCheck,
  Database,
} from 'lucide-react';

// Single source of truth for the left sidebar hierarchy.
// Used by Sidebar.jsx (renders it) and Header.jsx (derives page title / breadcrumb from it).
// Editing routes here does NOT change any actual route definitions in App.jsx —
// this only controls navigation presentation.
export const NAV_STRUCTURE = [
  { type: 'link', name: 'Overview', path: '/overview', icon: LayoutDashboard },
  {
    type: 'group',
    name: 'Assessment',
    icon: ClipboardCheck,
    children: [
      { name: 'Findings', path: '/findings' },
      { name: 'Review Queue', path: '/review-queue' },
      { name: 'Execution Gaps', path: '/execution-gaps' },
      { name: 'Negative Space', path: '/negative-space' },
    ],
  },
  { type: 'link', name: 'Analytics', path: '/analytics', icon: BarChart3 },
  {
    type: 'group',
    name: 'Governance',
    icon: ShieldCheck,
    children: [
      { name: 'Reports', path: '/reports' },
      { name: 'Triage Policies', path: '/triage-policies' },
    ],
  },
  {
    type: 'group',
    name: 'Data',
    icon: Database,
    children: [
      { name: 'Entities', path: '/entities' },
      { name: 'Evidence', path: '/evidence' },
      { name: 'Data Quality', path: '/data-quality' },
    ],
  },
];

// Resolves the current route to { title, breadcrumb[] } for the top header.
// Falls back gracefully for routes intentionally kept out of the sidebar
// (Ingest Data, entity drilldown) so the header never shows something blank.
export function getPageMeta(pathname) {
  for (const item of NAV_STRUCTURE) {
    if (item.type === 'link' && item.path === pathname) {
      return { title: item.name, breadcrumb: [item.name] };
    }
    if (item.type === 'group') {
      const child = item.children.find((c) => c.path === pathname);
      if (child) return { title: child.name, breadcrumb: [item.name, child.name] };
    }
  }
  if (pathname.startsWith('/entity/')) {
    return { title: 'Entity Dossier', breadcrumb: ['Data', 'Entities', 'Dossier'] };
  }
  if (pathname === '/' || pathname === '/upload') {
    return { title: 'Ingest Data', breadcrumb: ['Ingest Data'] };
  }
  return { title: 'SAT-SA', breadcrumb: [] };
}
