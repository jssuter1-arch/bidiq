import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Accordion from '@/components/ui/Accordion';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import CurrencyInput from '@/components/ui/CurrencyInput';
import PercentInput from '@/components/ui/PercentInput';
import Toggle from '@/components/ui/Toggle';
import Button from '@/components/ui/Button';
import ScenarioResultsPanel from './ScenarioResultsPanel';
import { formatCurrency } from '@/utils/format';
import api from '@/services/api';
import type { Scenario, Constraint } from '@/types/scenarios';

// Local live calculation (mirrors server logic — no DB needed)
function computeLocally(
  reno: number,
  constraintCosts: number,
  preRent: number,
  postRent: number,
  capRate: number,
  discountRate: number,
  holdMonths: number,
) {
  const totalCapital = reno + constraintCosts;
  const monthlyDelta = postRent - preRent;
  const annualDelta = monthlyDelta * 12;
  const valueCreated = capRate > 0 ? annualDelta / capRate : 0;

  // Build monthly cash flows
  const hold = Math.max(1, Math.round(holdMonths));
  const cf: number[] = new Array(hold + 1).fill(0);
  cf[0] = -totalCapital;
  for (let t = 1; t < hold; t++) cf[t] = monthlyDelta;
  cf[hold] = monthlyDelta + valueCreated;

  // NPV
  const discMonthly = Math.pow(1 + discountRate, 1 / 12) - 1;
  let npv = 0;
  for (let t = 0; t < cf.length; t++) {
    npv += cf[t] / Math.pow(1 + discMonthly, t);
  }

  // IRR (Newton-Raphson)
  const hasPos = cf.some((c) => c > 0);
  const hasNeg = cf.some((c) => c < 0);
  let irr: number | null = null;
  if (hasPos && hasNeg) {
    let r = 0.01;
    for (let i = 0; i < 100; i++) {
      let npvR = 0, dnpv = 0;
      for (let t = 0; t < cf.length; t++) {
        if (r <= -1) { r = 0.001; break; }
        const d = Math.pow(1 + r, t);
        npvR += cf[t] / d;
        if (t > 0) dnpv -= (t * cf[t]) / (d * (1 + r));
      }
      if (Math.abs(dnpv) < 1e-12) break;
      const dr = npvR / dnpv;
      r -= dr;
      if (Math.abs(dr) < 1e-7) break;
    }
    if (isFinite(r) && !isNaN(r) && r > -1 && r <= 10) {
      irr = Math.pow(1 + r, 12) - 1; // annualize
    }
  }

  const payback = monthlyDelta > 0 ? totalCapital / monthlyDelta : null;
  const meetsHurdle = irr !== null && irr >= 0.15;

  return { npv, irr, payback_months: payback, total_capital_required: totalCapital, value_created: valueCreated, meets_hurdle: meetsHurdle };
}

interface Props {
  existing?: Scenario;
  propertyId?: string;
  dealId?: string;
  availableConstraints?: Constraint[];
}

export default function ScenarioModelerForm({ existing, propertyId, dealId, availableConstraints = [] }: Props) {
  const navigate = useNavigate();
  const isEdit = !!existing;
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState({
    scenarioName: existing?.scenario_name ?? '',
    description: existing?.description ?? '',
    isBaseline: existing?.is_baseline ?? false,
    isRecommended: existing?.is_recommended ?? false,
    unitsAffected: existing?.units_affected ?? '',
    scopeSummary: existing?.scope_summary ?? '',
    triggeredConstraints: existing?.triggered_constraints ?? [] as string[],
    estimatedRenovationCost: existing?.estimated_renovation_cost ?? 0,
    preScenarioRentMonthly: existing?.pre_scenario_rent_monthly ?? 0,
    postScenarioRentMonthly: existing?.post_scenario_rent_monthly ?? 0,
    capRate: (existing?.cap_rate ?? 0.06) * 100, // display as percent
    discountRate: (existing?.discount_rate ?? 0.10) * 100,
    holdPeriodMonths: existing?.hold_period_months ?? 36,
    notes: existing?.notes ?? '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const set = (k: string, v: unknown) => setForm((prev) => ({ ...prev, [k]: v }));

  // Compute triggered constraint costs from selected constraints
  const triggeredCosts = availableConstraints
    .filter((c) => c.is_active && form.triggeredConstraints.includes(c.id))
    .reduce((s, c) => s + (c.triggered_cost_estimate ?? 0), 0);

  // Live results
  const liveResults = computeLocally(
    form.estimatedRenovationCost,
    triggeredCosts,
    form.preScenarioRentMonthly,
    form.postScenarioRentMonthly,
    form.capRate / 100,
    form.discountRate / 100,
    form.holdPeriodMonths,
  );

  // Auto-save for existing scenarios
  const autoSave = useCallback(async () => {
    if (!isEdit) return;
    try {
      await api.patch(`/v1/scenarios/${existing!.id}`, {
        scenarioName: form.scenarioName,
        description: form.description || undefined,
        isBaseline: form.isBaseline,
        isRecommended: form.isRecommended,
        estimatedRenovationCost: form.estimatedRenovationCost,
        triggeredConstraints: form.triggeredConstraints,
        preScenarioRentMonthly: form.preScenarioRentMonthly,
        postScenarioRentMonthly: form.postScenarioRentMonthly,
        capRate: form.capRate / 100,
        discountRate: form.discountRate / 100,
        holdPeriodMonths: form.holdPeriodMonths,
        notes: form.notes || undefined,
      });
      setSavedAt(new Date());
    } catch { /* non-fatal */ }
  }, [form, isEdit, existing]);

  useEffect(() => {
    if (!isEdit) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(autoSave, 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [form, isEdit, autoSave]);

  const handleSave = async () => {
    if (!form.scenarioName.trim()) { setError('Scenario name is required.'); return; }
    setLoading(true);
    setError('');
    try {
      const payload = {
        scenarioName: form.scenarioName,
        description: form.description || undefined,
        isBaseline: form.isBaseline,
        isRecommended: form.isRecommended,
        unitsAffected: form.unitsAffected ? Number(form.unitsAffected) : undefined,
        scopeSummary: form.scopeSummary || undefined,
        triggeredConstraints: form.triggeredConstraints,
        estimatedRenovationCost: form.estimatedRenovationCost,
        preScenarioRentMonthly: form.preScenarioRentMonthly,
        postScenarioRentMonthly: form.postScenarioRentMonthly,
        capRate: form.capRate / 100,
        discountRate: form.discountRate / 100,
        holdPeriodMonths: form.holdPeriodMonths,
        notes: form.notes || undefined,
        propertyId: propertyId ?? existing?.property_id ?? undefined,
        dealId: dealId ?? existing?.deal_id ?? undefined,
      };

      if (isEdit) {
        await api.patch(`/v1/scenarios/${existing!.id}`, payload);
        setSavedAt(new Date());
      } else {
        const { data } = await api.post('/v1/scenarios', payload);
        navigate(`/scenarios/${data.data.id}`);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Failed to save scenario.');
    } finally {
      setLoading(false);
    }
  };

  const toggleConstraint = (id: string) => {
    set('triggeredConstraints', form.triggeredConstraints.includes(id)
      ? form.triggeredConstraints.filter((c) => c !== id)
      : [...form.triggeredConstraints, id]);
  };

  const allSectionIds = ['identity', 'scope', 'capital', 'income', 'returns', 'notes'];

  const accordionItems = [
    {
      id: 'identity',
      title: 'Identity & Attachment',
      content: (
        <div className="space-y-3 pt-3">
          <Input
            label="Scenario Name"
            value={form.scenarioName}
            onChange={(e) => set('scenarioName', e.target.value)}
            placeholder="e.g. Cosmetic Refresh"
            required
            fullWidth
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="What does this scenario involve?"
            rows={2}
          />
          <div className="flex items-center gap-6">
            <Toggle checked={form.isBaseline} onChange={(v) => set('isBaseline', v)} label="Is Baseline" />
            <Toggle checked={form.isRecommended} onChange={(v) => set('isRecommended', v)} label="Is Recommended" />
          </div>
        </div>
      ),
    },
    {
      id: 'scope',
      title: 'Scope',
      content: (
        <div className="space-y-3 pt-3">
          <Input
            label="Units Affected"
            type="number"
            value={form.unitsAffected}
            onChange={(e) => set('unitsAffected', e.target.value)}
            placeholder="e.g. 4"
          />
          <Textarea
            label="Scope Summary"
            value={form.scopeSummary}
            onChange={(e) => set('scopeSummary', e.target.value)}
            placeholder="Describe the scope of work…"
            rows={2}
          />
          {availableConstraints.length > 0 && (
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">Triggered Constraints</p>
              <div className="space-y-2">
                {availableConstraints.map((c) => (
                  <label key={c.id} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.triggeredConstraints.includes(c.id)}
                      onChange={() => toggleConstraint(c.id)}
                      className="rounded border-[var(--border-default)] accent-brand-500"
                    />
                    <span className="text-sm text-[var(--text-primary)] flex-1">{c.description}</span>
                    {c.triggered_cost_estimate !== null && (
                      <span className="text-xs font-financial text-warning">{formatCurrency(c.triggered_cost_estimate, true)}</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'capital',
      title: 'Capital',
      content: (
        <div className="space-y-3 pt-3">
          <CurrencyInput
            label="Estimated Renovation Cost"
            value={form.estimatedRenovationCost}
            onChange={(v) => set('estimatedRenovationCost', v)}
          />
          {triggeredCosts > 0 && (
            <div className="rounded-lg bg-[var(--bg-elevated)] px-3 py-2.5">
              <p className="text-xs text-[var(--text-tertiary)]">Triggered Constraint Costs</p>
              <p className="text-sm font-financial font-semibold text-warning mt-0.5">{formatCurrency(triggeredCosts)}</p>
            </div>
          )}
          <div className="rounded-lg bg-[var(--bg-overlay)] px-3 py-2.5">
            <p className="text-xs text-[var(--text-tertiary)]">Total Capital Required</p>
            <p className="text-sm font-financial font-bold text-[var(--text-primary)] mt-0.5">
              {formatCurrency(form.estimatedRenovationCost + triggeredCosts)}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'income',
      title: 'Income Impact',
      content: (
        <div className="space-y-3 pt-3">
          <CurrencyInput
            label="Pre-Scenario Rent Monthly (total affected units)"
            value={form.preScenarioRentMonthly}
            onChange={(v) => set('preScenarioRentMonthly', v)}
          />
          <CurrencyInput
            label="Post-Scenario Rent Monthly (total affected units)"
            value={form.postScenarioRentMonthly}
            onChange={(v) => set('postScenarioRentMonthly', v)}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-[var(--bg-elevated)] px-3 py-2.5">
              <p className="text-xs text-[var(--text-tertiary)]">Monthly Delta</p>
              <p className={`text-sm font-financial font-semibold mt-0.5 ${form.postScenarioRentMonthly - form.preScenarioRentMonthly >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatCurrency(form.postScenarioRentMonthly - form.preScenarioRentMonthly)} / mo
              </p>
            </div>
            <div className="rounded-lg bg-[var(--bg-elevated)] px-3 py-2.5">
              <p className="text-xs text-[var(--text-tertiary)]">Annual Delta</p>
              <p className={`text-sm font-financial font-semibold mt-0.5 ${form.postScenarioRentMonthly - form.preScenarioRentMonthly >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatCurrency((form.postScenarioRentMonthly - form.preScenarioRentMonthly) * 12)} / yr
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'returns',
      title: 'Returns Assumptions',
      content: (
        <div className="space-y-3 pt-3">
          <div className="grid grid-cols-2 gap-3">
            <PercentInput
              label="Cap Rate"
              value={form.capRate}
              onChange={(v) => set('capRate', v)}
              min={0.1}
              max={50}
              step={0.1}
            />
            <PercentInput
              label="Discount Rate"
              value={form.discountRate}
              onChange={(v) => set('discountRate', v)}
              min={0}
              max={100}
              step={0.5}
            />
          </div>
          <Input
            label="Hold Period (months)"
            type="number"
            value={form.holdPeriodMonths}
            onChange={(e) => set('holdPeriodMonths', parseInt(e.target.value) || 36)}
            min={1}
            max={120}
          />
        </div>
      ),
    },
    {
      id: 'notes',
      title: 'Notes',
      content: (
        <div className="pt-3">
          <Textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Additional notes or rationale…"
            rows={4}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex gap-6">
      {/* Right rail: live results */}
      <div className="w-72 flex-shrink-0 order-last">
        <ScenarioResultsPanel
          results={{
            npv: liveResults.npv,
            irr: liveResults.irr,
            payback_months: liveResults.payback_months,
            total_capital_required: liveResults.total_capital_required,
            value_created: liveResults.value_created,
            meets_hurdle: liveResults.meets_hurdle,
          }}
        />
      </div>

      {/* Main form */}
      <div className="flex-1 min-w-0 space-y-4">
        <Accordion items={accordionItems} defaultOpen={allSectionIds} allowMultiple />

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          {isEdit && savedAt ? (
            <p className="text-xs text-[var(--text-tertiary)]">
              Saved {savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate(-1)} disabled={loading}>Cancel</Button>
            <Button onClick={handleSave} loading={loading}>Save Scenario</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
