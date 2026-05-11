import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutGrid, List } from 'lucide-react';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Table from '@/components/ui/Table';
import EmptyState from '@/components/ui/EmptyState';
import { AcquisitionDeal, DEAL_STATUS_LABELS, DealStatus, PIPELINE_STATUSES } from '@/types/deals';
import { formatCurrency, formatPercent, formatDate } from '@/utils/format';
import DealStatusBadge from '@/components/deals/DealStatusBadge';
import DealCard from '@/components/deals/DealCard';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...Object.entries(DEAL_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

const SOURCE_OPTIONS = [
  { value: '', label: 'All sources' },
  { value: 'broker_om', label: 'Broker OM' },
  { value: 'off_market', label: 'Off-Market' },
  { value: 'referral', label: 'Referral' },
  { value: 'public_listing', label: 'Public Listing' },
  { value: 'other', label: 'Other' },
];

const KANBAN_COLUMNS: DealStatus[] = [...PIPELINE_STATUSES, 'closed_won'];

export default function DealsPage() {
  const navigate = useNavigate();
  const { userRole } = useAuthStore();
  const [deals, setDeals] = useState<AcquisitionDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [search, setSearch] = useState('');

  const canWrite = userRole === 'admin' || userRole === 'project_manager';

  useEffect(() => {
    setLoading(true);
    const params: Record<string, any> = { limit: 100 };
    if (statusFilter) params.status = statusFilter;
    if (sourceFilter) params.source = sourceFilter;
    if (search) params.search = search;

    api
      .get('/v1/deals', { params })
      .then((r) => setDeals(r.data.data || []))
      .catch(() => setDeals([]))
      .finally(() => setLoading(false));
  }, [statusFilter, sourceFilter, search]);

  const columns = [
    {
      key: 'deal_name',
      header: 'Deal',
      render: (r: AcquisitionDeal) => (
        <div>
          <p className="font-medium text-[var(--text-primary)]">{r.deal_name}</p>
          {(r.city || r.state) && (
            <p className="text-xs text-[var(--text-tertiary)]">{[r.city, r.state].filter(Boolean).join(', ')}</p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r: AcquisitionDeal) => <DealStatusBadge status={r.status} size="sm" dot />,
    },
    {
      key: 'asking_price',
      header: 'Asking Price',
      align: 'right' as const,
      render: (r: AcquisitionDeal) => (
        <span className="font-mono text-sm">{r.asking_price ? formatCurrency(r.asking_price, true) : '—'}</span>
      ),
    },
    {
      key: 'irr',
      header: 'IRR',
      align: 'right' as const,
      render: (r: AcquisitionDeal) => {
        const m = Array.isArray(r.active_model) ? r.active_model[0] : r.active_model;
        if (!m) return <span className="text-[var(--text-tertiary)]">—</span>;
        return (
          <span className={`font-mono text-sm ${m.meets_hurdle ? 'text-success' : 'text-danger'}`}>
            {m.irr != null ? formatPercent(m.irr * 100) : '—'}
          </span>
        );
      },
    },
    {
      key: 'expected_close_date',
      header: 'Expected Close',
      render: (r: AcquisitionDeal) => formatDate(r.expected_close_date),
    },
    {
      key: 'source',
      header: 'Source',
      render: (r: AcquisitionDeal) => (
        <span className="text-xs text-[var(--text-secondary)]">{r.source?.replace('_', ' ') || '—'}</span>
      ),
    },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Deal Pipeline"
        subtitle={`${deals.length} deal${deals.length !== 1 ? 's' : ''}`}
        actions={
          <div className="flex items-center gap-2">
            {canWrite && (
              <Button iconLeft={<Plus className="w-4 h-4" />} onClick={() => navigate('/deals/new')}>
                New Deal
              </Button>
            )}
          </div>
        }
      />

      {/* Filters + view toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search deals…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48"
        />
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-44"
        />
        <Select
          options={SOURCE_OPTIONS}
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="w-36"
        />
        <div className="ml-auto flex border border-[var(--border-default)] rounded-lg overflow-hidden">
          <button
            onClick={() => setView('kanban')}
            className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
              view === 'kanban'
                ? 'bg-brand-500/10 text-brand-400'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Board
          </button>
          <button
            onClick={() => setView('table')}
            className={`px-3 py-1.5 text-sm flex items-center gap-1.5 border-l border-[var(--border-default)] transition-colors ${
              view === 'table'
                ? 'bg-brand-500/10 text-brand-400'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            <List className="w-3.5 h-3.5" /> Table
          </button>
        </div>
      </div>

      {/* Kanban view */}
      {view === 'kanban' && !loading && (
        <>
          {deals.length === 0 ? (
            <EmptyState
              icon={<Plus className="w-6 h-6" />}
              title="No deals yet"
              description="Start tracking acquisition opportunities in your pipeline."
              action={canWrite ? { label: 'New Deal', onClick: () => navigate('/deals/new') } : undefined}
            />
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
              {KANBAN_COLUMNS.map((status) => {
                const colDeals = deals.filter((d) => d.status === status);
                return (
                  <div key={status} className="flex-shrink-0 w-60 space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                        {DEAL_STATUS_LABELS[status]}
                      </span>
                      <span className="text-xs text-[var(--text-tertiary)] font-mono">{colDeals.length}</span>
                    </div>
                    <div className="space-y-2">
                      {colDeals.map((d) => <DealCard key={d.id} deal={d} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Table view */}
      {view === 'table' && (
        <Table
          columns={columns}
          data={deals}
          loading={loading}
          onRowClick={(r) => navigate(`/deals/${r.id}`)}
          emptyText="No deals found"
        />
      )}
    </PageWrapper>
  );
}
