import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitBranch, Building2, GitCommit, AlertTriangle,
  FileWarning, Clock, Coffee, Filter,
} from 'lucide-react';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/utils/format';

type ItemType = 'scenario_decision' | 'deal_promotion' | 'change_order_categorization' | 'budget_alert' | 'permit_expiring' | 'underwriting_stale';
type Urgency = 'today' | 'this_week' | 'background';

interface HubItem {
  id: string;
  type: ItemType;
  title: string;
  context: string;
  open_url: string;
  urgency: Urgency;
  amount?: number;
  days_pending?: number;
  entity_name?: string;
}

const TYPE_ICON: Record<ItemType, React.ReactNode> = {
  scenario_decision: <GitBranch className="w-4 h-4 text-brand-400" />,
  deal_promotion: <Building2 className="w-4 h-4 text-blue-400" />,
  change_order_categorization: <GitCommit className="w-4 h-4 text-amber-400" />,
  budget_alert: <AlertTriangle className="w-4 h-4 text-danger" />,
  permit_expiring: <FileWarning className="w-4 h-4 text-warning" />,
  underwriting_stale: <Clock className="w-4 h-4 text-[var(--text-tertiary)]" />,
};

const TYPE_LABELS: Record<ItemType, string> = {
  scenario_decision: 'Scenario Decision',
  deal_promotion: 'Deal Promotion',
  change_order_categorization: 'Change Orders',
  budget_alert: 'Budget Alert',
  permit_expiring: 'Permit Expiring',
  underwriting_stale: 'Underwriting Stale',
};

const URGENCY_BADGE: Record<Urgency, React.ReactNode> = {
  today: <Badge variant="danger">Today</Badge>,
  this_week: <Badge variant="warning">This Week</Badge>,
  background: <Badge variant="default">Background</Badge>,
};

const TYPE_FILTER_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'scenario_decision', label: 'Scenario Decisions' },
  { value: 'deal_promotion', label: 'Deal Promotions' },
  { value: 'change_order_categorization', label: 'Change Orders' },
  { value: 'budget_alert', label: 'Budget Alerts' },
  { value: 'permit_expiring', label: 'Permits Expiring' },
  { value: 'underwriting_stale', label: 'Stale Underwriting' },
];

const URGENCY_FILTER_OPTIONS = [
  { value: '', label: 'All urgencies' },
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'background', label: 'Background' },
];

export default function DecisionHubPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<HubItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = async (invalidate = false) => {
    if (invalidate) {
      setRefreshing(true);
      await api.post('/v1/decision-hub/invalidate').catch(() => null);
    }
    try {
      const params: Record<string, string> = {};
      if (typeFilter) params.type = typeFilter;
      if (urgencyFilter) params.urgency = urgencyFilter;
      const { data } = await api.get('/v1/decision-hub', { params });
      setItems(data.data?.items || []);
      setCounts(data.data?.counts || {});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { setLoading(true); load(); }, [typeFilter, urgencyFilter]);

  const toggleSelect = (id: string) =>
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const urgencyGroups: Record<Urgency, HubItem[]> = {
    today: items.filter((i) => i.urgency === 'today'),
    this_week: items.filter((i) => i.urgency === 'this_week'),
    background: items.filter((i) => i.urgency === 'background'),
  };

  const URGENCY_SECTION_LABELS: Record<Urgency, string> = {
    today: 'Today',
    this_week: 'This Week',
    background: 'Background',
  };

  return (
    <PageWrapper>
      <PageHeader
        title="Decision Hub"
        subtitle="Everything that needs attention, prioritized"
        actions={
          <Button variant="secondary" size="sm" iconLeft={<Filter className="w-3.5 h-3.5" />}
            loading={refreshing} onClick={() => load(true)}>Refresh</Button>
        }
      />

      {/* Counts */}
      <div className="flex gap-3">
        {[
          { label: 'Today', count: counts.today || 0, variant: 'danger' as const },
          { label: 'This Week', count: counts.this_week || 0, variant: 'warning' as const },
          { label: 'Background', count: counts.background || 0, variant: 'default' as const },
        ].map((c) => (
          <div key={c.label} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <span className="text-xs text-[var(--text-tertiary)]">{c.label}</span>
            <Badge variant={c.variant}>{c.count}</Badge>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select options={TYPE_FILTER_OPTIONS} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} />
        <Select options={URGENCY_FILTER_OPTIONS} value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value)} />
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="sticky top-0 z-10 flex items-center gap-3 p-3 bg-brand-500/10 border border-brand-500/20 rounded-lg">
          <span className="text-sm font-medium text-brand-400">{selected.size} selected</span>
          <Button size="sm" variant="secondary" onClick={() => setSelected(new Set())}>Clear selection</Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : items.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 gap-4">
          <Coffee className="w-12 h-12 text-[var(--text-tertiary)]" />
          <div className="text-center">
            <p className="text-base font-semibold text-[var(--text-primary)]">All clear.</p>
            <p className="text-sm text-[var(--text-tertiary)] mt-1">No decisions pending right now.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {(['today', 'this_week', 'background'] as Urgency[]).map((urgency) => {
            const group = urgencyGroups[urgency];
            if (group.length === 0) return null;
            return (
              <div key={urgency} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    {URGENCY_SECTION_LABELS[urgency]}
                  </span>
                  <div className="flex-1 border-t border-[var(--border-subtle)]" />
                </div>
                {group.map((item) => (
                  <Card key={item.id} className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="rounded mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-shrink-0 mt-0.5">
                      {TYPE_ICON[item.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{item.title}</p>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{item.context}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {URGENCY_BADGE[item.urgency]}
                          <Badge variant="default">{TYPE_LABELS[item.type]}</Badge>
                        </div>
                      </div>
                      {item.amount && (
                        <p className="text-xs font-mono text-[var(--text-tertiary)] mt-1">{formatCurrency(item.amount)}</p>
                      )}
                    </div>
                    <Button
                      variant="secondary" size="sm"
                      onClick={() => navigate(item.open_url)}
                    >
                      Open →
                    </Button>
                  </Card>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
}
