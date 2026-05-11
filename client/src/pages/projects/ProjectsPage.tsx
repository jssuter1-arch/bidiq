import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen } from 'lucide-react';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import { BudgetHealthBadge } from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import EmptyState from '@/components/ui/EmptyState';
import { formatCurrency, formatDate } from '@/utils/format';

const STATUS_COLORS: Record<string, any> = { planning: 'info', active: 'success', on_hold: 'warning', completed: 'default', cancelled: 'default' };
const PRIORITY_COLORS: Record<string, any> = { low: 'default', medium: 'info', high: 'warning', critical: 'danger' };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/v1/projects', { params: { status: status || undefined, limit: 100 } })
      .then((r) => setProjects(r.data.data || []))
      .finally(() => setLoading(false));
  }, [status]);

  const columns = [
    { key: 'name', header: 'Project', render: (r: any) => (
      <div>
        <p className="font-medium text-[var(--text-primary)]">{r.name}</p>
        <p className="text-xs text-[var(--text-tertiary)]">{r.properties?.name}</p>
      </div>
    )},
    { key: 'status', header: 'Status', render: (r: any) => <Badge variant={STATUS_COLORS[r.status]} size="sm" dot>{r.status?.replace('_', ' ')}</Badge> },
    { key: 'priority', header: 'Priority', render: (r: any) => <Badge variant={PRIORITY_COLORS[r.priority]} size="sm">{r.priority}</Badge> },
    { key: 'budget', header: 'Budget', align: 'right' as const, render: (r: any) => (
      <div className="space-y-1">
        <span className="font-mono text-sm">{formatCurrency(r.current_budget, true)}</span>
        <ProgressBar value={r.current_budget > 0 ? (r.actual_spend / r.current_budget) * 100 : 0} size="xs" />
      </div>
    )},
    { key: 'actual_spend', header: 'Spent', align: 'right' as const, render: (r: any) => <span className="font-mono">{formatCurrency(r.actual_spend, true)}</span> },
    { key: 'health', header: 'Health', render: (r: any) => {
      const pct = r.current_budget > 0 ? (r.actual_spend / r.current_budget) * 100 : 0;
      return <BudgetHealthBadge pct={pct} />;
    }},
    { key: 'target_completion', header: 'Target', render: (r: any) => formatDate(r.target_completion) },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} projects`}
        actions={
          <div className="flex gap-2">
            <Select options={[
              { value: '', label: 'All status' },
              { value: 'planning', label: 'Planning' },
              { value: 'active', label: 'Active' },
              { value: 'on_hold', label: 'On Hold' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
            ]} value={status} onChange={(e) => setStatus(e.target.value)} className="w-36" />
            <Button iconLeft={<Plus className="w-4 h-4" />} onClick={() => navigate('/projects/new')}>New Project</Button>
          </div>
        }
      />

      {!loading && projects.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="w-6 h-6" />}
          title="No projects"
          description="Create your first project to start tracking renovation budgets."
          action={{ label: 'New Project', onClick: () => navigate('/projects/new') }}
        />
      ) : (
        <Table columns={columns} data={projects} loading={loading} onRowClick={(r) => navigate(`/projects/${r.id}`)} emptyText="No projects found" />
      )}
    </PageWrapper>
  );
}
