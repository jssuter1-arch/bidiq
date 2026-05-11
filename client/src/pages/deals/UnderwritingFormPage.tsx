import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import CurrencyInput from '@/components/ui/CurrencyInput';
import PercentInput from '@/components/ui/PercentInput';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { UnderwritingModel } from '@/types/deals';
import api from '@/services/api';

interface UWForm {
  modelName: string;
  proposedPurchasePrice: number;
  downPaymentPct: number;
  seniorDebtRate: number;
  seniorDebtAmortizationMonths: number;
  hasConstructionLoan: boolean;
  constructionLoanAmount: number;
  constructionLoanRate: number;
  constructionLoanTermMonths: number;
  estimatedRenovationCost: number;
  estimatedClosingCosts: number;
  estimatedCarryCosts: number;
  currentRentRollMonthly: number;
  projectedPostRenoRentMonthly: number;
  currentOtherIncomeMonthly: number;
  projectedOtherIncomeMonthly: number;
  currentOperatingExpensesMonthly: number;
  projectedOperatingExpensesMonthly: number;
  vacancyFactorPct: number;
  exitCapRate: number;
  holdPeriodMonths: number;
  hurdleRate: number;
  discountRate: number;
  notes: string;
}

const DEFAULTS: UWForm = {
  modelName: '',
  proposedPurchasePrice: 0,
  downPaymentPct: 25,
  seniorDebtRate: 7,
  seniorDebtAmortizationMonths: 360,
  hasConstructionLoan: false,
  constructionLoanAmount: 0,
  constructionLoanRate: 9,
  constructionLoanTermMonths: 18,
  estimatedRenovationCost: 0,
  estimatedClosingCosts: 0,
  estimatedCarryCosts: 0,
  currentRentRollMonthly: 0,
  projectedPostRenoRentMonthly: 0,
  currentOtherIncomeMonthly: 0,
  projectedOtherIncomeMonthly: 0,
  currentOperatingExpensesMonthly: 0,
  projectedOperatingExpensesMonthly: 0,
  vacancyFactorPct: 5,
  exitCapRate: 6,
  holdPeriodMonths: 36,
  hurdleRate: 15,
  discountRate: 10,
  notes: '',
};

function modelToForm(m: UnderwritingModel): UWForm {
  return {
    modelName: m.model_name || '',
    proposedPurchasePrice: m.proposed_purchase_price,
    downPaymentPct: (m.down_payment_pct ?? 0.25) * 100,
    seniorDebtRate: (m.senior_debt_rate ?? 0.07) * 100,
    seniorDebtAmortizationMonths: m.senior_debt_amortization_months ?? 360,
    hasConstructionLoan: m.has_construction_loan ?? false,
    constructionLoanAmount: m.construction_loan_amount ?? 0,
    constructionLoanRate: (m.construction_loan_rate ?? 0.09) * 100,
    constructionLoanTermMonths: m.construction_loan_term_months ?? 18,
    estimatedRenovationCost: m.estimated_renovation_cost ?? 0,
    estimatedClosingCosts: m.estimated_closing_costs ?? 0,
    estimatedCarryCosts: m.estimated_carry_costs ?? 0,
    currentRentRollMonthly: m.current_rent_roll_monthly ?? 0,
    projectedPostRenoRentMonthly: m.projected_post_reno_rent_monthly ?? 0,
    currentOtherIncomeMonthly: m.current_other_income_monthly ?? 0,
    projectedOtherIncomeMonthly: m.projected_other_income_monthly ?? 0,
    currentOperatingExpensesMonthly: m.current_operating_expenses_monthly ?? 0,
    projectedOperatingExpensesMonthly: m.projected_operating_expenses_monthly ?? 0,
    vacancyFactorPct: (m.vacancy_factor_pct ?? 0.05) * 100,
    exitCapRate: (m.exit_cap_rate ?? 0.06) * 100,
    holdPeriodMonths: m.hold_period_months ?? 36,
    hurdleRate: (m.hurdle_rate ?? 0.15) * 100,
    discountRate: (m.discount_rate ?? 0.10) * 100,
    notes: m.notes || '',
  };
}

function formToPayload(f: UWForm) {
  return {
    modelName: f.modelName || undefined,
    proposedPurchasePrice: f.proposedPurchasePrice,
    downPaymentPct: f.downPaymentPct / 100,
    seniorDebtRate: f.seniorDebtRate / 100,
    seniorDebtAmortizationMonths: f.seniorDebtAmortizationMonths,
    hasConstructionLoan: f.hasConstructionLoan,
    constructionLoanAmount: f.hasConstructionLoan ? f.constructionLoanAmount : undefined,
    constructionLoanRate: f.hasConstructionLoan ? f.constructionLoanRate / 100 : undefined,
    constructionLoanTermMonths: f.hasConstructionLoan ? f.constructionLoanTermMonths : undefined,
    estimatedRenovationCost: f.estimatedRenovationCost || undefined,
    estimatedClosingCosts: f.estimatedClosingCosts || undefined,
    estimatedCarryCosts: f.estimatedCarryCosts || undefined,
    currentRentRollMonthly: f.currentRentRollMonthly || undefined,
    projectedPostRenoRentMonthly: f.projectedPostRenoRentMonthly || undefined,
    currentOtherIncomeMonthly: f.currentOtherIncomeMonthly || undefined,
    projectedOtherIncomeMonthly: f.projectedOtherIncomeMonthly || undefined,
    currentOperatingExpensesMonthly: f.currentOperatingExpensesMonthly || undefined,
    projectedOperatingExpensesMonthly: f.projectedOperatingExpensesMonthly || undefined,
    vacancyFactorPct: f.vacancyFactorPct / 100,
    exitCapRate: f.exitCapRate / 100,
    holdPeriodMonths: f.holdPeriodMonths,
    hurdleRate: f.hurdleRate / 100,
    discountRate: f.discountRate / 100,
    notes: f.notes || undefined,
  };
}

export default function UnderwritingFormPage() {
  // /deals/:dealId/underwriting/new — create mode
  // /underwriting/:id/edit          — edit mode
  const { dealId, id } = useParams<{ dealId?: string; id?: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState<UWForm>(DEFAULTS);
  const [resolvedDealId, setResolvedDealId] = useState<string>(dealId || '');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/v1/underwriting/${id}`)
      .then((r) => {
        const m: UnderwritingModel = r.data.data;
        setResolvedDealId(m.deal_id);
        setForm(modelToForm(m));
      })
      .catch(() => navigate('/deals'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = <K extends keyof UWForm>(k: K, v: UWForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.proposedPurchasePrice <= 0) { setError('Purchase price is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = formToPayload(form);
      if (isEdit) {
        await api.patch(`/v1/underwriting/${id}`, payload);
      } else {
        await api.post(`/v1/deals/${dealId}/underwriting`, payload);
      }
      navigate(`/deals/${resolvedDealId}?tab=underwriting`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save model.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <PageWrapper>
      <PageHeader title="Underwriting Model" />
      <div className="space-y-3 max-w-2xl">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}
      </div>
    </PageWrapper>
  );

  return (
    <PageWrapper>
      <PageHeader
        title={isEdit ? 'Edit Underwriting Model' : 'New Underwriting Model'}
        subtitle="All returns are computed server-side on save"
      />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Model name */}
        <Card className="space-y-3">
          <Input
            label="Model Name (optional)"
            value={form.modelName}
            onChange={(e) => set('modelName', e.target.value)}
            placeholder="e.g. Base Case, Stress Test"
            fullWidth
          />
        </Card>

        {/* Capital Structure */}
        <Card className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Capital Structure</h3>
          <div className="grid grid-cols-2 gap-3">
            <CurrencyInput
              label="Proposed Purchase Price *"
              value={form.proposedPurchasePrice || ''}
              onChange={(v) => set('proposedPurchasePrice', v)}
              fullWidth
            />
            <PercentInput
              label="Down Payment %"
              value={form.downPaymentPct}
              onChange={(v) => set('downPaymentPct', v)}
              min={0} max={100} step={1}
              fullWidth
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <PercentInput
              label="Senior Debt Rate %"
              value={form.seniorDebtRate}
              onChange={(v) => set('seniorDebtRate', v)}
              min={0} max={30} step={0.125}
              fullWidth
            />
            <Input
              label="Amortization (months)"
              type="number"
              value={form.seniorDebtAmortizationMonths}
              onChange={(e) => set('seniorDebtAmortizationMonths', parseInt(e.target.value) || 360)}
              fullWidth
            />
          </div>
        </Card>

        {/* Renovation / Costs */}
        <Card className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Renovation & Acquisition Costs</h3>
          <div className="grid grid-cols-3 gap-3">
            <CurrencyInput label="Renovation Cost" value={form.estimatedRenovationCost || ''} onChange={(v) => set('estimatedRenovationCost', v)} fullWidth />
            <CurrencyInput label="Closing Costs" value={form.estimatedClosingCosts || ''} onChange={(v) => set('estimatedClosingCosts', v)} fullWidth />
            <CurrencyInput label="Carry Costs" value={form.estimatedCarryCosts || ''} onChange={(v) => set('estimatedCarryCosts', v)} fullWidth />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="rounded border-[var(--border-default)] text-brand-600"
              checked={form.hasConstructionLoan}
              onChange={(e) => set('hasConstructionLoan', e.target.checked)}
            />
            <span className="text-sm text-[var(--text-primary)]">Has construction loan (reno funded separately)</span>
          </label>

          {form.hasConstructionLoan && (
            <div className="grid grid-cols-3 gap-3 pl-6 border-l-2 border-[var(--border-subtle)]">
              <CurrencyInput label="Loan Amount" value={form.constructionLoanAmount || ''} onChange={(v) => set('constructionLoanAmount', v)} fullWidth />
              <PercentInput label="Rate %" value={form.constructionLoanRate} onChange={(v) => set('constructionLoanRate', v)} min={0} max={30} step={0.125} fullWidth />
              <Input label="Term (months)" type="number" value={form.constructionLoanTermMonths} onChange={(e) => set('constructionLoanTermMonths', parseInt(e.target.value) || 18)} fullWidth />
            </div>
          )}
        </Card>

        {/* Income */}
        <Card className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Income (monthly)</h3>
          <div className="grid grid-cols-2 gap-3">
            <CurrencyInput label="Current Rent Roll" value={form.currentRentRollMonthly || ''} onChange={(v) => set('currentRentRollMonthly', v)} fullWidth />
            <CurrencyInput label="Post-Reno Rent Roll" value={form.projectedPostRenoRentMonthly || ''} onChange={(v) => set('projectedPostRenoRentMonthly', v)} fullWidth />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <CurrencyInput label="Current Other Income" value={form.currentOtherIncomeMonthly || ''} onChange={(v) => set('currentOtherIncomeMonthly', v)} fullWidth />
            <CurrencyInput label="Projected Other Income" value={form.projectedOtherIncomeMonthly || ''} onChange={(v) => set('projectedOtherIncomeMonthly', v)} fullWidth />
          </div>
        </Card>

        {/* Expenses */}
        <Card className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Expenses (monthly)</h3>
          <div className="grid grid-cols-2 gap-3">
            <CurrencyInput label="Current Opex" value={form.currentOperatingExpensesMonthly || ''} onChange={(v) => set('currentOperatingExpensesMonthly', v)} fullWidth />
            <CurrencyInput label="Projected Opex" value={form.projectedOperatingExpensesMonthly || ''} onChange={(v) => set('projectedOperatingExpensesMonthly', v)} fullWidth />
          </div>
          <PercentInput
            label="Vacancy Factor %"
            value={form.vacancyFactorPct}
            onChange={(v) => set('vacancyFactorPct', v)}
            min={0} max={50} step={0.5}
            hint="Applied to gross potential income"
            fullWidth
          />
        </Card>

        {/* Return Parameters */}
        <Card className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Return Parameters</h3>
          <div className="grid grid-cols-2 gap-3">
            <PercentInput label="Exit Cap Rate %" value={form.exitCapRate} onChange={(v) => set('exitCapRate', v)} min={1} max={20} step={0.25} fullWidth />
            <Input label="Hold Period (months)" type="number" min="1" max="120" value={form.holdPeriodMonths} onChange={(e) => set('holdPeriodMonths', parseInt(e.target.value) || 36)} fullWidth />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <PercentInput label="Hurdle Rate %" value={form.hurdleRate} onChange={(v) => set('hurdleRate', v)} min={0} max={100} step={0.5} fullWidth />
            <PercentInput label="Discount Rate %" value={form.discountRate} onChange={(v) => set('discountRate', v)} min={0} max={100} step={0.5} fullWidth />
          </div>
        </Card>

        {/* Notes */}
        <Card>
          <Textarea label="Model Notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} fullWidth />
        </Card>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={() => navigate(`/deals/${resolvedDealId}`)}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {isEdit ? 'Save Changes' : 'Create & Calculate'}
          </Button>
        </div>
      </form>
    </PageWrapper>
  );
}
