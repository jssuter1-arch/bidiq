import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import { formatCurrency, formatPercent } from '@/utils/format';
import api from '@/services/api';

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

export default function ExecutiveBudgetPerformanceCard() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/v1/lender-dossier')
      .then((r) => setKpis(r.data.data?.kpis ?? null))
      .catch(() => setKpis(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-48 rounded-xl" />;
  if (!kpis || kpis.totalProjects === 0) return null;

  const underBudgetPct = kpis.completedProjects > 0
    ? (kpis.completedUnderBudget / kpis.completedProjects) * 100
    : null;

  return (
    <Card className="space-y-4 cursor-pointer" onClick={() => navigate('/lender-dossier')}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Budget Performance</h3>
        </div>
        <span className="text-xs text-brand-400 font-medium">Lender Dossier →</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-0.5">
          <p className="text-2xs text-[var(--text-tertiary)] uppercase tracking-wide">Portfolio Budget</p>
          <p className="text-lg font-mono font-bold text-[var(--text-primary)]">{formatCurrency(kpis.totalBudget, true)}</p>
          <p className="text-xs text-[var(--text-tertiary)]">{formatCurrency(kpis.totalSpend, true)} spent</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-2xs text-[var(--text-tertiary)] uppercase tracking-wide">Portfolio Variance</p>
          <p className={`text-lg font-mono font-bold ${kpis.portfolioVariancePct > 0 ? 'text-danger' : 'text-success'}`}>
            {kpis.portfolioVariancePct > 0 ? '+' : ''}{formatPercent(kpis.portfolioVariancePct)}
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">vs declared budget</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-2xs text-[var(--text-tertiary)] uppercase tracking-wide">Loan Exposure</p>
          <p className="text-sm font-mono font-semibold text-[var(--text-primary)]">{formatCurrency(kpis.totalLoanExposure, true)}</p>
          <p className="text-xs text-[var(--text-tertiary)]">LTV {formatPercent(kpis.ltvPct)}</p>
        </div>
        {underBudgetPct !== null && (
          <div className="space-y-0.5">
            <p className="text-2xs text-[var(--text-tertiary)] uppercase tracking-wide">On-Budget Rate</p>
            <p className={`text-sm font-mono font-semibold ${underBudgetPct >= 80 ? 'text-success' : 'text-warning'}`}>
              {formatPercent(underBudgetPct)}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">{kpis.completedUnderBudget}/{kpis.completedProjects} completed</p>
          </div>
        )}
      </div>
    </Card>
  );
}
