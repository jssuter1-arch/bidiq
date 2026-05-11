import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import CurrencyInput from '@/components/ui/CurrencyInput';
import api from '@/services/api';
import type { Constraint, ConstraintType } from '@/types/scenarios';

const CONSTRAINT_TYPE_OPTIONS = [
  { value: 'zoning_use', label: 'Zoning Use' },
  { value: 'unit_count_cap', label: 'Unit Count Cap' },
  { value: 'bedroom_count_cap', label: 'Bedroom Count Cap' },
  { value: 'fire_code_trigger', label: 'Fire Code Trigger' },
  { value: 'historic_district', label: 'Historic District' },
  { value: 'parking_minimum', label: 'Parking Minimum' },
  { value: 'height_limit', label: 'Height Limit' },
  { value: 'setback', label: 'Setback' },
  { value: 'other', label: 'Other' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existing?: Constraint;
  propertyId?: string;
  dealId?: string;
}

export default function ConstraintFormDialog({ open, onClose, onSuccess, existing, propertyId, dealId }: Props) {
  const isEdit = !!existing;

  const [form, setForm] = useState({
    constraintType: (existing?.constraint_type ?? 'other') as ConstraintType,
    description: existing?.description ?? '',
    triggerThreshold: existing?.trigger_threshold ?? '',
    triggeredCostEstimate: existing?.triggered_cost_estimate ?? null as number | null,
    source: existing?.source ?? '',
    sourceDate: existing?.source_date ?? '',
    notes: existing?.notes ?? '',
    isActive: existing?.is_active ?? true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: unknown) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    if (!form.description.trim()) { setError('Description is required.'); return; }

    setLoading(true);
    setError('');
    try {
      const payload = {
        constraintType: form.constraintType,
        description: form.description.trim(),
        triggerThreshold: form.triggerThreshold.trim() || undefined,
        triggeredCostEstimate: form.triggeredCostEstimate ?? undefined,
        source: form.source.trim() || undefined,
        sourceDate: form.sourceDate || undefined,
        notes: form.notes.trim() || undefined,
        isActive: form.isActive,
        ...(isEdit ? {} : { propertyId, dealId }),
      };

      if (isEdit) {
        await api.patch(`/v1/constraints/${existing!.id}`, payload);
      } else {
        await api.post('/v1/constraints', payload);
      }
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Failed to save constraint.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Constraint' : 'Add Constraint'} size="lg">
      <div className="space-y-4">
        <Select
          label="Constraint Type"
          value={form.constraintType}
          onChange={(e) => set('constraintType', e.target.value as ConstraintType)}
          options={CONSTRAINT_TYPE_OPTIONS}
          fullWidth
        />

        <Textarea
          label="Description"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Describe the constraint and its implications…"
          rows={2}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Trigger Threshold"
            value={form.triggerThreshold}
            onChange={(e) => set('triggerThreshold', e.target.value)}
            placeholder="e.g. Any unit count increase"
          />
          <CurrencyInput
            label="Triggered Cost Estimate"
            value={form.triggeredCostEstimate ?? 0}
            onChange={(v) => set('triggeredCostEstimate', v)}
            placeholder="0"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Source"
            value={form.source}
            onChange={(e) => set('source', e.target.value)}
            placeholder="e.g. Boston Fire Code §28.04"
          />
          <Input
            label="Source Date"
            type="date"
            value={form.sourceDate}
            onChange={(e) => set('sourceDate', e.target.value)}
          />
        </div>

        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Additional context…"
          rows={2}
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading}>{isEdit ? 'Save Changes' : 'Add Constraint'}</Button>
        </div>
      </div>
    </Modal>
  );
}
