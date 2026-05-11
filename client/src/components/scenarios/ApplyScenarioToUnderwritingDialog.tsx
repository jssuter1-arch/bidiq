import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import api from '@/services/api';
import type { Scenario } from '@/types/scenarios';

interface Deal {
  id: string;
  deal_name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  scenario: Scenario;
}

export default function ApplyScenarioToUnderwritingDialog({ open, onClose, onSuccess, scenario }: Props) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [dealId, setDealId] = useState(scenario.deal_id ?? '');
  const [mode, setMode] = useState<'new_version' | 'update_active'>('new_version');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    api.get('/v1/deals').then((r) => setDeals(r.data.data ?? [])).catch(() => {});
  }, [open]);

  const handleApply = async () => {
    if (!dealId) { setError('Select a deal to apply to.'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post(`/v1/scenarios/${scenario.id}/apply-to-underwriting`, { dealId, mode });
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Failed to apply to underwriting.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Apply to Underwriting" size="md">
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          Apply <strong className="text-[var(--text-primary)]">{scenario.scenario_name}</strong>'s economics to a deal's underwriting model.
          This is unidirectional — the scenario will not change if the underwriting is subsequently edited.
        </p>

        {!scenario.deal_id && (
          <Select
            label="Deal"
            value={dealId}
            onChange={(e) => setDealId(e.target.value)}
            placeholder="Select a deal…"
            options={deals.map((d) => ({ value: d.id, label: d.deal_name }))}
            fullWidth
          />
        )}

        <Select
          label="Mode"
          value={mode}
          onChange={(e) => setMode(e.target.value as typeof mode)}
          options={[
            { value: 'new_version', label: 'Create new underwriting version from this scenario' },
            { value: 'update_active', label: 'Update active underwriting version' },
          ]}
          fullWidth
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleApply} loading={loading}>Apply to Underwriting</Button>
        </div>
      </div>
    </Modal>
  );
}
