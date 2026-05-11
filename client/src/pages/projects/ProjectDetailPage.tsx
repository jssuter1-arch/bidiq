import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, DollarSign, FileText, Shield, TrendingUp, Download, BarChart2 } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import ProjectSummaryPDF from '@/components/pdf/ProjectSummaryPDF';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Tabs from '@/components/ui/Tabs';
import Badge from '@/components/ui/Badge';
import { BudgetHealthBadge } from '@/components/ui/Badge';
import Table from '@/components/ui/Table';
import ProgressBar from '@/components/ui/ProgressBar';
import Skeleton from '@/components/ui/Skeleton';
import { formatCurrency, formatDate, formatPercent } from '@/utils/format';
import { useModuleAccess } from '@/hooks/useModuleAccess';
// Phase 3: Budget Lifecycle components
import BudgetTimelineSection from '@/components/budget-lifecycle/BudgetTimelineSection';
import BankReconciliationPanel from '@/components/budget-lifecycle/BankReconciliationPanel';

const BASE_TABS = [
  { id: 'overview', label: 'Overview', icon: <DollarSign className="w-3.5 h-3.5" /> },
  { id: 'budget', label: 'Budget', icon: <FileText className="w-3.5 h-3.5" /> },
  { id: 'invoices', label: 'Invoices', icon: <FileText className="w-3.5 h-3.5" /> },
  { id: 'permits', label: 'Permits', icon: <Shield className="w-3.5 h-3.5" /> },
  { id: 'draws', label: 'Draws', icon: <TrendingUp className="w-3.5 h-3.5" /> },
];

const TIMELINE_TAB = { id: 'timeline', label: 'Timeline', icon: <BarChart2 className="w-3.5 h-3.5" /> };

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const { hasAccess } = useModuleAccess();

  const hasBudgetAccess = hasAccess('budget_lifecycle');

  useEffect(() => {
    api.get(`/v1/projects/${id}`)
      .then((r) => setProject(r.data.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageWrapper><Skeleton className="h-8 w-48 mb-4" count={4} /></PageWrapper>;
  if (!project) return <PageWrapper><p className="text-[var(--text-secondary)]">Project not found</p></PageWrapper>;

  const budgetPct = project.current_budget > 0 ? (project.actual_spend / project.current_budget) * 100 : 0;

  // Phase 3: add Timeline tab when module access granted
  const TABS = hasBudgetAccess ? [...BASE_TABS, TIMELINE_TAB] : BASE_TABS;

  const tabsWithCounts = TABS.map((t) => ({
    ...t,
    count: t.id === 'budget' ? project.budget_line_items?.length
      : t.id === 'invoices' ? project.contractor_invoices?.length
      : t.id === 'permits' ? project.permits?.length
      : t.id === 'draws' ? project.loan_draws?.length
      : undefined
  }));

  return (
    <PageWrapper>
      <PageHeader
        title={project.name}
        subtitle={project.properties?.name ? `${project.properties.name} · ${project.properties.city}, ${project.properties.state}` : ''}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" iconLeft={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/projects')}>Back</Button>
            <PDFDownloadLink
              document={<ProjectSummaryPDF project={project} />}
              fileName={`${project.name.replace(/\s+/g, '-').toLowerCase()}-summary.pdf`}
              style={{ textDecoration: 'none' }}
            >
              <Button variant="ghost" iconLeft={<Download className="w-4 h-4" />}>Export</Button>
            </PDFDownloadLink>
            <Button variant="secondary" iconLeft={<Edit className="w-4 h-4" />} onClick={() => navigate(`/projects/${id}/edit`)}>Edit</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Initial Budget', value: formatCurrency(project.initial_budget) },
          { label: 'Current Budget', value: formatCurrency(project.current_budget) },
          { label: 'Actual Spend', value: formatCurrency(project.actual_spend) },
          { label: 'Remaining', value: formatCurrency(project.current_budget - project.actual_spend) },
        ].map((s) => (
          <Card key={s.label} className="space-y-1">
            <p className="text-xs text-[var(--text-tertiary)]">{s.label}</p>
            <p className="text-lg font-mono font-semibold text-[var(--text-primary)]">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-tertiary)]">Budget utilization</span>
          <BudgetHealthBadge pct={budgetPct} />
        </div>
        <ProgressBar value={budgetPct} showLabel size="md" />
      </Card>

      <Tabs tabs={tabsWithCounts} active={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Details</h3>
            <dl className="space-y-2">
              {[
                { label: 'Status', value: <Badge variant="success" dot size="sm">{project.status?.replace('_', ' ')}</Badge> },
                { label: 'Type', value: project.project_type?.replace('_', ' ') },
                { label: 'Priority', value: project.priority },
                { label: 'Start Date', value: formatDate(project.start_date) },
                { label: 'Target Completion', value: formatDate(project.target_completion) },
                { label: 'Construction Loan', value: project.has_construction_loan ? 'Yes' : 'No' },
              ].map((d) => (
                <div key={d.label} className="flex justify-between text-sm">
                  <dt className="text-[var(--text-tertiary)]">{d.label}</dt>
                  <dd className="text-[var(--text-primary)] font-medium capitalize">{d.value}</dd>
                </div>
              ))}
            </dl>
          </Card>
          {project.description && (
            <Card className="space-y-2">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Description</h3>
              <p className="text-sm text-[var(--text-secondary)]">{project.description}</p>
            </Card>
          )}
          {/* Phase 3: Bank Reconciliation panel in overview when loan present and module access granted */}
          {hasBudgetAccess && project.has_construction_loan && (
            <div className="md:col-span-2">
              <BankReconciliationPanel projectId={project.id} />
            </div>
          )}
        </div>
      )}

      {tab === 'budget' && (
        <Table
          columns={[
            { key: 'category', header: 'Category', render: (r: any) => <span className="capitalize">{r.category?.replace('_', ' ')}</span> },
            { key: 'description', header: 'Description' },
            { key: 'status', header: 'Status', render: (r: any) => <Badge size="sm" variant={r.status === 'completed' ? 'success' : r.status === 'in_progress' ? 'info' : 'default'}>{r.status}</Badge> },
            { key: 'budgeted_amount', header: 'Budget', align: 'right', render: (r: any) => <span className="font-mono">{formatCurrency(r.budgeted_amount)}</span> },
            { key: 'actual_amount', header: 'Actual', align: 'right', render: (r: any) => <span className="font-mono">{formatCurrency(r.actual_amount)}</span> },
            { key: 'variance', header: 'Variance', align: 'right', render: (r: any) => {
              const v = r.actual_amount - r.budgeted_amount;
              return <span className={`font-mono ${v > 0 ? 'text-danger' : 'text-success'}`}>{formatCurrency(Math.abs(v))}</span>;
            }},
          ]}
          data={project.budget_line_items || []}
          emptyText="No budget line items"
        />
      )}

      {tab === 'invoices' && (
        <Table
          columns={[
            { key: 'invoice_number', header: 'Invoice #', render: (r: any) => r.invoice_number || '—' },
            { key: 'contractors', header: 'Contractor', render: (r: any) => r.contractors?.company_name },
            { key: 'invoice_date', header: 'Date', render: (r: any) => formatDate(r.invoice_date) },
            { key: 'total_amount', header: 'Amount', align: 'right', render: (r: any) => <span className="font-mono">{formatCurrency(r.total_amount)}</span> },
            { key: 'status', header: 'Status', render: (r: any) => <Badge size="sm" variant={r.status === 'paid' ? 'success' : r.status === 'approved' ? 'info' : 'warning'}>{r.status}</Badge> },
            { key: 'is_change_order', header: 'CO', render: (r: any) => r.is_change_order ? <Badge size="sm" variant="warning">CO</Badge> : null },
          ]}
          data={project.contractor_invoices || []}
          emptyText="No invoices"
        />
      )}

      {tab === 'permits' && (
        <Table
          columns={[
            { key: 'permit_type', header: 'Type', render: (r: any) => <span className="capitalize">{r.permit_type?.replace('_', ' ')}</span> },
            { key: 'permit_number', header: 'Permit #', render: (r: any) => r.permit_number || 'Pending' },
            { key: 'status', header: 'Status', render: (r: any) => <Badge size="sm" variant={r.status === 'active' ? 'success' : 'default'}>{r.status?.replace('_', ' ')}</Badge> },
            { key: 'issue_date', header: 'Issued', render: (r: any) => formatDate(r.issue_date) },
            { key: 'expiry_date', header: 'Expires', render: (r: any) => formatDate(r.expiry_date) },
            { key: 'fee_amount', header: 'Fee', align: 'right', render: (r: any) => <span className="font-mono">{formatCurrency(r.fee_amount)}</span> },
          ]}
          data={project.permits || []}
          emptyText="No permits"
        />
      )}

      {tab === 'draws' && (
        <Table
          columns={[
            { key: 'draw_number', header: '#', render: (r: any) => `Draw ${r.draw_number}` },
            { key: 'title', header: 'Title', render: (r: any) => r.title || '—' },
            { key: 'status', header: 'Status', render: (r: any) => <Badge size="sm" variant={r.status === 'funded' ? 'success' : r.status === 'approved' ? 'info' : r.status === 'denied' ? 'danger' : 'warning'}>{r.status}</Badge> },
            { key: 'requested_amount', header: 'Requested', align: 'right', render: (r: any) => <span className="font-mono">{formatCurrency(r.requested_amount)}</span> },
            { key: 'funded_amount', header: 'Funded', align: 'right', render: (r: any) => <span className="font-mono">{r.funded_amount ? formatCurrency(r.funded_amount) : '—'}</span> },
            { key: 'completion_percentage', header: '% Complete', render: (r: any) => formatPercent(r.completion_percentage) },
          ]}
          data={project.loan_draws || []}
          emptyText="No draws"
        />
      )}

      {/* Phase 3: Budget Timeline tab — only rendered when module access granted */}
      {tab === 'timeline' && hasBudgetAccess && (
        <BudgetTimelineSection projectId={project.id} canWrite />
      )}
    </PageWrapper>
  );
}
