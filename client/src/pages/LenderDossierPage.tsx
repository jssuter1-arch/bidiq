import { useEffect, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Download, TrendingUp, Building2, AlertTriangle } from 'lucide-react';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { formatCurrency, formatDate, formatPercent } from '@/utils/format';
import ProjectVarianceDistributionBar from '@/components/budget-lifecycle/ProjectVarianceDistributionBar';
import LenderDossierPDF from '@/components/budget-lifecycle/LenderDossierPDF';

interface KPIs {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  completedUnderBudget: number;
  totalBudget: number;
  totalSpend: number;
  totalLoanExposure: number;
  ltvPct: number;
  portfolioVariancePct: number;
}

interface ProjectRow {
  id: string;
  name: string;
  status: string;
  projectType: string;
  property: { name?: string; address?: string; city?: string; state?: string } | null;
  currentBudget: number | null;
  actualSpend: number | null;
  initialBudget: number | null;
  variancePct: number;
  hasConstructionLoan: boolean;
  loanAmount: number | null;
  lenderName: string | null;
  startDate: string | null;
  targetCompletion: string | null;
  statusChangedAt: string | null;
  bankDeclaredBudget: number | null;
  bankDeclaredDate: string | null;
  changeOrderTotal: number | null;
}

interface DossierData {
  kpis: KPIs;
  projects: ProjectRow[];
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  active: 'success',
  planning: 'info',
  completed: 'default',
  on_hold: 'warning',
  cancelled: 'danger',
};

export default function LenderDossierPage() {
  const [data, setData] = useState<DossierData | null>(null);
  const [pdfData, setPdfData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({ contentRef: printRef });

  useEffect(() => {
    api.get('/v1/lender-dossier')
      .then((r) => setData(r.data.data ?? null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const r = await api.post('/v1/lender-dossier/export');
      setPdfData(r.data.data);
      // Small delay to let the hidden print div render before triggering print
      setTimeout(() => { handlePrint(); setPdfData(null); }, 200);
    } catch {
      // fallback: print the visible page
      handlePrint();
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <PageHeader title="Lender Dossier" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </PageWrapper>
    );
  }

  if (!data || data.kpis.totalProjects === 0) {
    return (
      <PageWrapper>
        <PageHeader title="Lender Dossier" subtitle="Portfolio summary for lender presentations" />
        <Card className="flex flex-col items-center py-16 space-y-3">
          <Building2 className="w-10 h-10 text-[var(--text-tertiary)]" />
          <p className="text-sm text-[var(--text-secondary)]">No projects found. Create a project to populate this dossier.</p>
        </Card>
      </PageWrapper>
    );
  }

  const { kpis, projects } = data;
  const underBudgetPct = kpis.completedProjects > 0
    ? (kpis.completedUnderBudget / kpis.completedProjects) * 100
    : null;

  return (
    <PageWrapper>
      {/* Hidden PDF render target */}
      {pdfData && (
        <div className="hidden">
          <div ref={printRef}>
            <LenderDossierPDF data={pdfData} />
          </div>
        </div>
      )}

      <PageHeader
        title="Lender Dossier"
        subtitle="Portfolio summary for lender presentations"
        actions={
          <Button
            iconLeft={<Download className="w-4 h-4" />}
            onClick={handleExport}
            loading={exporting}
          >
            Export PDF
          </Button>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Portfolio Budget',
            value: formatCurrency(kpis.totalBudget, true),
            sub: `${formatCurrency(kpis.totalSpend, true)} spent`,
            icon: <TrendingUp className="w-4 h-4" />,
          },
          {
            label: 'Portfolio Variance',
            value: `${kpis.portfolioVariancePct >= 0 ? '+' : ''}${formatPercent(kpis.portfolioVariancePct)}`,
            sub: 'vs declared budget',
            icon: <AlertTriangle className="w-4 h-4" />,
            danger: kpis.portfolioVariancePct > 5,
          },
          {
            label: 'Loan Exposure',
            value: formatCurrency(kpis.totalLoanExposure, true),
            sub: `LTV ${formatPercent(kpis.ltvPct)}`,
            icon: <Building2 className="w-4 h-4" />,
          },
          {
            label: 'On-Budget Rate',
            value: underBudgetPct !== null ? formatPercent(underBudgetPct) : '—',
            sub: `${kpis.completedUnderBudget}/${kpis.completedProjects} completed`,
            icon: <TrendingUp className="w-4 h-4" />,
            success: underBudgetPct !== null && underBudgetPct >= 80,
          },
        ].map((kpi) => (
          <Card key={kpi.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-tertiary)] uppercase tracking-wide">{kpi.label}</span>
              <span className="text-[var(--text-tertiary)]">{kpi.icon}</span>
            </div>
            <p className={`text-2xl font-heading font-semibold font-financial ${
              kpi.danger ? 'text-danger' : kpi.success ? 'text-success' : 'text-[var(--text-primary)]'
            }`}>
              {kpi.value}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">{kpi.sub}</p>
          </Card>
        ))}
      </div>

      {/* Track record card */}
      {kpis.completedProjects > 0 && (
        <Card className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Track Record</h3>
            <Badge variant={underBudgetPct !== null && underBudgetPct >= 80 ? 'success' : 'warning'}>
              {kpis.completedUnderBudget}/{kpis.completedProjects} under budget
            </Badge>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            {kpis.completedProjects} completed project{kpis.completedProjects !== 1 ? 's' : ''} ·{' '}
            {kpis.completedUnderBudget} delivered at or under declared budget.
          </p>
        </Card>
      )}

      {/* Per-project table */}
      <Card className="space-y-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Project Detail</h3>
        <div className="space-y-4">
          {projects.map((p) => (
            <div
              key={p.id}
              className="border border-[var(--border-subtle)] rounded-xl p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{p.name}</p>
                  {p.property && (
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {p.property.city}, {p.property.state}
                    </p>
                  )}
                </div>
                <Badge variant={STATUS_VARIANT[p.status] ?? 'default'} size="sm">
                  {p.status.replace('_', ' ')}
                </Badge>
              </div>

              <ProjectVarianceDistributionBar
                budget={p.currentBudget ?? 0}
                spend={p.actualSpend ?? 0}
                changeOrders={p.changeOrderTotal ?? 0}
              />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-[var(--text-tertiary)] uppercase tracking-wide text-2xs">Budget</p>
                  <p className="font-mono font-medium text-[var(--text-primary)]">{formatCurrency(p.currentBudget)}</p>
                </div>
                <div>
                  <p className="text-[var(--text-tertiary)] uppercase tracking-wide text-2xs">Spend</p>
                  <p className={`font-mono font-medium ${p.variancePct > 0 ? 'text-danger' : 'text-[var(--text-primary)]'}`}>
                    {formatCurrency(p.actualSpend)}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--text-tertiary)] uppercase tracking-wide text-2xs">Bank Declared</p>
                  <p className="font-mono font-medium text-[var(--text-primary)]">
                    {p.bankDeclaredBudget ? formatCurrency(p.bankDeclaredBudget) : '—'}
                  </p>
                  {p.bankDeclaredDate && (
                    <p className="text-[var(--text-tertiary)] text-2xs">{formatDate(p.bankDeclaredDate)}</p>
                  )}
                </div>
                <div>
                  <p className="text-[var(--text-tertiary)] uppercase tracking-wide text-2xs">Lender</p>
                  <p className="font-medium text-[var(--text-primary)]">{p.lenderName ?? '—'}</p>
                  {p.hasConstructionLoan && p.loanAmount && (
                    <p className="font-mono text-[var(--text-tertiary)] text-2xs">{formatCurrency(p.loanAmount)}</p>
                  )}
                </div>
              </div>

              {p.variancePct !== 0 && (
                <div className={`text-xs font-medium ${p.variancePct > 0 ? 'text-danger' : 'text-success'}`}>
                  {p.variancePct > 0 ? '+' : ''}{formatPercent(p.variancePct)} vs declared budget
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* LTV recommendation */}
      {kpis.ltvPct > 0 && (
        <Card className={`border ${kpis.ltvPct > 80 ? 'border-danger/30' : kpis.ltvPct > 65 ? 'border-warning/30' : 'border-success/30'}`}>
          <div className="flex items-center gap-3">
            <Building2 className={`w-5 h-5 flex-shrink-0 ${kpis.ltvPct > 80 ? 'text-danger' : kpis.ltvPct > 65 ? 'text-warning' : 'text-success'}`} />
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Portfolio LTV: {formatPercent(kpis.ltvPct)}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {kpis.ltvPct > 80
                  ? 'High leverage — lender review recommended before adding new loan facilities.'
                  : kpis.ltvPct > 65
                  ? 'Moderate leverage — within typical construction lending parameters.'
                  : 'Conservative leverage — strong collateral coverage relative to loan exposure.'
                }
              </p>
            </div>
          </div>
        </Card>
      )}
    </PageWrapper>
  );
}
