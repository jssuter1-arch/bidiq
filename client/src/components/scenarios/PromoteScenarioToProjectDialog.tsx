import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import CurrencyInput from '@/components/ui/CurrencyInput';
import Select from '@/components/ui/Select';
import Toggle from '@/components/ui/Toggle';
import { formatCurrency } from '@/utils/format';
import api from '@/services/api';
import type { Scenario, ScenarioComparison } from '@/types/scenarios';

interface Props {
  open: boolean;
  onClose: () => void;
  comparison: ScenarioComparison;
  scenario: Scenario;
  propertyId?: string;
}

export default function PromoteScenarioToProjectDialog({ open, onClose, comparison, scenario, propertyId }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    projectName: `${scenario.scenario_name} — ${comparison.comparison_name} Decision`,
    projectType: 'renovation' as string,
    initialBudget: scenario.total_capital_required,
    hasConstructionLoan: false,
    constructionLoanAmount: 0,
    status: 'planning' as string,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: unknown) => setForm((prev) => ({ ...prev, [k]: v }));

  const handlePromote = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post(`/v1/scenario-comparisons/${comparison.id}/promote-to-project`, {
        projectName: form.projectName,
        projectType: form.projectType,
        initialBudget: form.initialBudget,
        hasConstructionLoan: form.hasConstructionLoan,
        constructionLoanAmount: form.hasConstructionLoan ? form.constructionLoanAmount : undefined,
        status: form.status,
        propertyId: propertyId ?? scenario.property_id,
      });
      navigate(`/projects/${data.data.projectId}`);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Failed to promote to project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Promote to Project" size="lg">
      <div className="space-y-4">
        {step === 1 && (
          <>
            <div className="rounded-xl bg-[var(--bg-elevated)] p-4 space-y-2">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{scenario.scenario_name}</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-[var(--text-tertiary)]">NPV</p>
                  <p className={`text-sm font-financial font-semibold ${(scenario.npv ?? 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                    {scenario.npv !== null ? formatCurrency(scenario.npv, true) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-tertiary)]">IRR</p>
                  <p className="text-sm font-financial font-semibold text-[var(--text-primary)]">
                    {scenario.irr !== null ? `${(scenario.irr * 100).toFixed(1)}%` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-tertiary)]">Capital Required</p>
                  <p className="text-sm font-financial font-semibold text-[var(--text-primary)]">
                    {formatCurrency(scenario.total_capital_required, true)}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              This will create a new project with the selected scenario's economics as the initial budget snapshot.
            </p>
          </>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <Input
              label="Project Name"
              value={form.projectName}
              onChange={(e) => set('projectName', e.target.value)}
              fullWidth
            />
            <Select
              label="Project Type"
              value={form.projectType}
              onChange={(e) => set('projectType', e.target.value)}
              options={[
                { value: 'renovation', label: 'Renovation' },
                { value: 'new_construction', label: 'New Construction' },
                { value: 'repair', label: 'Repair' },
                { value: 'capital_improvement', label: 'Capital Improvement' },
                { value: 'unit_turn', label: 'Unit Turn' },
              ]}
              fullWidth
            />
            <CurrencyInput
              label="Initial Budget"
              value={form.initialBudget}
              onChange={(v) => set('initialBudget', v)}
            />
            <Toggle
              checked={form.hasConstructionLoan}
              onChange={(v) => set('hasConstructionLoan', v)}
              label="Has Construction Loan"
            />
            {form.hasConstructionLoan && (
              <CurrencyInput
                label="Construction Loan Amount"
                value={form.constructionLoanAmount}
                onChange={(v) => set('constructionLoanAmount', v)}
              />
            )}
            <Select
              label="Initial Status"
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              options={[
                { value: 'planning', label: 'Planning' },
                { value: 'active', label: 'Active' },
              ]}
              fullWidth
            />
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={step === 1 ? onClose : () => setStep(1)} disabled={loading}>
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          {step === 1 ? (
            <Button onClick={() => setStep(2)}>Configure Project →</Button>
          ) : (
            <Button onClick={handlePromote} loading={loading}>Promote to Project</Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
