import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Building2, FolderOpen, Users, FileText,
  RefreshCw, BarChart3, Calculator, Wallet, Shield, TrendingUp,
  Bell, Settings, ChevronLeft, ChevronRight, LogOut, FileBarChart,
  Briefcase, ClipboardList, GitBranch, AlertCircle, LayoutTemplate, AlertTriangle,
  Target, PieChart, Clock, BarChart2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/store/authStore';
import { useModuleAccess } from '@/hooks/useModuleAccess';

const NAV_ITEMS_BASE = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/properties', icon: Building2, label: 'Properties' },
  { to: '/projects', icon: FolderOpen, label: 'Projects' },
  { to: '/contractors', icon: Users, label: 'Contractors' },
  { to: '/budget', icon: FileText, label: 'Budget' },
  { label: 'divider' },
  { to: '/yardi', icon: RefreshCw, label: 'Yardi Import' },
  { to: '/benchmarks', icon: BarChart3, label: 'Cost Intel' },
  { to: '/equity', icon: Calculator, label: 'Equity Calc' },
  { label: 'divider' },
  { to: '/cash', icon: Wallet, label: 'Cash Flow' },
  { to: '/permits', icon: Shield, label: 'Permits' },
  { to: '/loan-draws', icon: TrendingUp, label: 'Loan Draws' },
  { label: 'divider' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/audit', icon: FileBarChart, label: 'Audit Log', adminOnly: true },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { signOut, userRole } = useAuthStore();
  const navigate = useNavigate();
  const { hasAccess } = useModuleAccess();

  const navItems = [
    ...(hasAccess('portfolio_intelligence') ? [{ to: '/decision-hub', icon: Target, label: 'Decision Hub' }, { label: 'divider' }] : []),
    ...NAV_ITEMS_BASE.slice(0, 5), // dashboard → budget
    ...(hasAccess('deal_intelligence') || hasAccess('budget_lifecycle')
      ? [{ label: 'divider' }]
      : []),
    ...(hasAccess('deal_intelligence')
      ? [{ to: '/deals', icon: Briefcase, label: 'Pipeline' }]
      : []),
    ...(hasAccess('budget_lifecycle')
      ? [{ to: '/lender-dossier', icon: ClipboardList, label: 'Lender Dossier' }]
      : []),
    ...(hasAccess('scenario_modeling') ? [{ label: 'divider' }] : []),
    ...(hasAccess('scenario_modeling') ? [{ to: '/scenarios', icon: GitBranch, label: 'Scenarios' }] : []),
    ...(hasAccess('scenario_modeling') ? [{ to: '/constraints', icon: AlertCircle, label: 'Constraints' }] : []),
    ...(hasAccess('cost_intelligence_extended') ? [{ label: 'divider' }] : []),
    ...(hasAccess('cost_intelligence_extended') ? [{ to: '/intelligence/templates', icon: LayoutTemplate, label: 'Templates' }] : []),
    ...(hasAccess('cost_intelligence_extended') ? [{ to: '/intelligence/change-orders', icon: AlertTriangle, label: 'Change Orders' }] : []),
    ...(hasAccess('portfolio_intelligence') ? [{ label: 'divider' }] : []),
    ...(hasAccess('portfolio_intelligence') ? [{ to: '/portfolio', icon: PieChart, label: 'Portfolio' }] : []),
    ...(hasAccess('portfolio_intelligence') ? [{ to: '/portfolio/capital-timeline', icon: Clock, label: 'Capital Timeline' }] : []),
    ...(hasAccess('portfolio_intelligence') ? [{ to: '/portfolio/cost-savings', icon: BarChart2, label: 'Cost Savings' }] : []),
    ...(hasAccess('portfolio_intelligence') ? [{ to: '/portfolio/benchmarks', icon: BarChart3, label: 'Benchmarks' }] : []),
    ...NAV_ITEMS_BASE.slice(5), // remaining items starting from divider
  ];

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="flex-shrink-0 flex flex-col h-full border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 h-14 border-b border-[var(--border-subtle)] flex-shrink-0">
        {!collapsed && (
          <span className="text-base font-heading font-bold text-[var(--text-primary)] whitespace-nowrap">
            Bid<span className="text-brand-400">IQ</span>
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn('rounded-lg p-1.5 hover:bg-[var(--bg-elevated)] transition-colors text-[var(--text-tertiary)]', collapsed && 'mx-auto')}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
        {navItems.map((item, i) => {
          if (item.label === 'divider') {
            return <div key={i} className="my-1 mx-3 border-t border-[var(--border-subtle)]" />;
          }
          if ((item as any).adminOnly && userRole !== 'admin') return null;
          const Icon = item.icon!;
          return (
            <NavLink
              key={item.to}
              to={item.to!}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2 mx-1 rounded-lg text-sm font-medium transition-all',
                'hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
                isActive
                  ? 'bg-brand-500/10 text-brand-400'
                  : 'text-[var(--text-secondary)]',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-[var(--border-subtle)] p-2">
        <button
          onClick={async () => { await signOut(); navigate('/login'); }}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-danger transition-all',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </motion.aside>
  );
}
