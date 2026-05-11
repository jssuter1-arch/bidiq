import { formatCurrency, formatDate, formatPercent } from '@/utils/format';

interface ProjectRow {
  id: string;
  name: string;
  status: string;
  projectType: string;
  property: { name?: string; address?: string; city?: string; state?: string } | null;
  currentBudget: number | null;
  actualSpend: number | null;
  initialBudget: number | null;
  hasConstructionLoan: boolean;
  loanAmount: number | null;
  lenderName: string | null;
  startDate: string | null;
  targetCompletion: string | null;
  bankDeclaredBudget: number | null;
  bankDeclaredDate: string | null;
  changeOrderTotal: number | null;
}

interface DossierData {
  exportedAt: string;
  organization: { name: string; logo_url: string | null };
  projects: ProjectRow[];
}

interface Props {
  data: DossierData;
}

export default function LenderDossierPDF({ data }: Props) {
  const totalBudget = data.projects.reduce((s, p) => s + (p.currentBudget ?? 0), 0);
  const totalSpend = data.projects.reduce((s, p) => s + (p.actualSpend ?? 0), 0);
  const totalLoans = data.projects.filter((p) => p.hasConstructionLoan).reduce((s, p) => s + (p.loanAmount ?? 0), 0);
  const variancePct = totalBudget > 0 ? ((totalSpend - totalBudget) / totalBudget) * 100 : 0;

  return (
    <div className="bg-white text-gray-900 font-sans p-8 max-w-4xl mx-auto print:p-6" id="lender-dossier-pdf">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{data.organization.name}</h1>
          <p className="text-sm text-gray-500 mt-1">Lender Portfolio Dossier</p>
          <p className="text-xs text-gray-400 mt-0.5">Generated {formatDate(data.exportedAt)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Confidential</p>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Portfolio Budget', value: formatCurrency(totalBudget) },
          { label: 'Total Spend', value: formatCurrency(totalSpend) },
          { label: 'Total Loan Exposure', value: formatCurrency(totalLoans) },
          { label: 'Portfolio Variance', value: `${variancePct >= 0 ? '+' : ''}${formatPercent(variancePct)}` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Project Table */}
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Project Detail</h2>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left p-2 font-semibold text-gray-600">Project</th>
            <th className="text-left p-2 font-semibold text-gray-600">Status</th>
            <th className="text-right p-2 font-semibold text-gray-600">Budget</th>
            <th className="text-right p-2 font-semibold text-gray-600">Spend</th>
            <th className="text-right p-2 font-semibold text-gray-600">Declared</th>
            <th className="text-right p-2 font-semibold text-gray-600">COs</th>
            <th className="text-left p-2 font-semibold text-gray-600">Lender</th>
            <th className="text-right p-2 font-semibold text-gray-600">Loan</th>
          </tr>
        </thead>
        <tbody>
          {data.projects.map((p, i) => {
            const variance = (p.actualSpend ?? 0) - (p.currentBudget ?? 0);
            return (
              <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="p-2">
                  <p className="font-medium text-gray-900">{p.name}</p>
                  {p.property && (
                    <p className="text-gray-400">{p.property.city}, {p.property.state}</p>
                  )}
                </td>
                <td className="p-2 capitalize text-gray-600">{p.status.replace('_', ' ')}</td>
                <td className="p-2 text-right font-mono">{formatCurrency(p.currentBudget)}</td>
                <td className={`p-2 text-right font-mono ${variance > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatCurrency(p.actualSpend)}
                </td>
                <td className="p-2 text-right font-mono text-gray-500">{formatCurrency(p.bankDeclaredBudget)}</td>
                <td className="p-2 text-right font-mono text-amber-600">{formatCurrency(p.changeOrderTotal)}</td>
                <td className="p-2 text-gray-600">{p.lenderName ?? '—'}</td>
                <td className="p-2 text-right font-mono">{p.hasConstructionLoan ? formatCurrency(p.loanAmount) : '—'}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-100 font-semibold">
            <td className="p-2" colSpan={2}>Total</td>
            <td className="p-2 text-right font-mono">{formatCurrency(totalBudget)}</td>
            <td className={`p-2 text-right font-mono ${variancePct > 0 ? 'text-red-600' : ''}`}>{formatCurrency(totalSpend)}</td>
            <td className="p-2" colSpan={2} />
            <td className="p-2" />
            <td className="p-2 text-right font-mono">{formatCurrency(totalLoans)}</td>
          </tr>
        </tfoot>
      </table>

      <p className="text-xs text-gray-400 mt-8 text-center">
        Confidential — prepared for lending purposes only — {data.organization.name}
      </p>
    </div>
  );
}
