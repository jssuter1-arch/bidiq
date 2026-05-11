import { useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, Building2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import { formatCurrency, formatDate } from '@/utils/format';
import api from '@/services/api';

interface ReconciliationData {
  projectId: string;
  projectName: string;
  hasConstructionLoan: boolean;
  loanAmount: number | null;
  lenderName: string | null;
  bankDeclaredSnapshot: {
    id: string;
    budget_total: number;
    actual_spend_at_snapshot: number;
    effective_date: string;
  } | null;
  liveBudget: number;
  liveSpend: number;
  declaredBudget: number;
  declaredSpend: number;
  budgetDrift: number;
  spendDrift: number;
  isInSync: boolean;
}

interface Props {
  projectId: string;
}

export default function BankReconciliationPanel({ projectId }: Props) {
  const [data, setData] = useState<ReconciliationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/v1/projects/${projectId}/bank-reconciliation`)
      .then((r) => setData(r.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <Skeleton className="h-32 rounded-xl" />;
  if (!data) return null;
  if (!data.hasConstructionLoan) return null;

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-brand-400" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Bank Reconciliation</h3>
        {data.lenderName && (
          <span className="text-xs text-[var(--text-tertiary)] ml-auto">{data.lenderName}</span>
        )}
      </div>

      {/* Sync status */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
        data.isInSync
          ? 'bg-success-bg text-success'
          : 'bg-warning-bg text-warning'
      }`}>
        {data.isInSync
          ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
          : <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        }
        <span className="font-medium">
          {data.isInSync ? 'In sync with bank records' : 'Drift detected — review required'}
        </span>
        {data.bankDeclaredSnapshot && (
          <span className="ml-auto text-xs opacity-70">
            Declared {formatDate(data.bankDeclaredSnapshot.effective_date)}
          </span>
        )}
      </div>

      {!data.bankDeclaredSnapshot && (
        <p className="text-sm text-[var(--text-tertiary)]">No bank-declared snapshot on file yet.</p>
      )}

      {data.bankDeclaredSnapshot && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Declared Budget', declared: data.declaredBudget, live: data.liveBudget, drift: data.budgetDrift },
            { label: 'Declared Spend', declared: data.declaredSpend, live: data.liveSpend, drift: data.spendDrift },
          ].map(({ label, declared, live, drift }) => (
            <div key={label} className="space-y-1">
              <p className="text-2xs text-[var(--text-tertiary)] uppercase tracking-wide">{label}</p>
              <p className="text-sm font-mono font-semibold text-[var(--text-primary)]">{formatCurrency(declared)}</p>
              <p className="text-xs text-[var(--text-secondary)]">Live: {formatCurrency(live)}</p>
              {Math.abs(drift) >= 1 && (
                <p className={`text-xs font-mono font-medium ${drift > 0 ? 'text-danger' : 'text-success'}`}>
                  {drift > 0 ? '+' : ''}{formatCurrency(drift)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {data.loanAmount && (
        <div className="pt-2 border-t border-[var(--border-subtle)]">
          <p className="text-2xs text-[var(--text-tertiary)] uppercase tracking-wide">Loan Amount</p>
          <p className="text-sm font-mono font-semibold text-[var(--text-primary)] mt-0.5">{formatCurrency(data.loanAmount)}</p>
        </div>
      )}
    </Card>
  );
}
