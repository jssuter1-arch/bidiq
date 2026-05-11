import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import api from '@/services/api';

const CO_CATEGORIES = [
  { value: 'scope_creep', label: 'Scope Creep' },
  { value: 'design_change', label: 'Design Change' },
  { value: 'unforeseen_conditions', label: 'Unforeseen Conditions' },
  { value: 'material_escalation', label: 'Material Escalation' },
  { value: 'labor_shortage', label: 'Labor Shortage' },
  { value: 'permit_requirement', label: 'Permit Requirement' },
  { value: 'owner_request', label: 'Owner Request' },
  { value: 'error_omission', label: 'Error / Omission' },
  { value: 'other', label: 'Other' },
];

interface Props {
  open: boolean;
  invoiceId: string;
  invoiceNumber?: string;
  onCancel: () => void;
  /** Called after successful categorization + approval */
  onDone: () => void;
  /** If true, only categorize (no approval) */
  categorizeOnly?: boolean;
}

export default function ChangeOrderCategorizationDialog({ open, invoiceId, invoiceNumber, onCancel, onDone, categorizeOnly }: Props) {
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!category) { setError('Please select a category.'); return; }
    setSaving(true);
    setError(null);
    try {
      if (categorizeOnly) {
        await api.patch(`/v1/change-orders/${invoiceId}/categorize`, {
          change_order_category: category,
          category_notes: notes || undefined,
        });
      } else {
        await api.post(`/v1/invoices/${invoiceId}/approve`, {
          changeOrderCategory: category,
          categoryNotes: notes || undefined,
        });
      }
      onDone();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={categorizeOnly ? 'Categorize Change Order' : 'Categorize & Approve Change Order'}
      size="sm"
    >
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          {categorizeOnly
            ? `Assign a cause category to invoice ${invoiceNumber ?? invoiceId}.`
            : `Invoice ${invoiceNumber ?? invoiceId} is a change order. Select the root cause before approving.`}
        </p>

        <Select
          label="Change order category"
          options={CO_CATEGORIES}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Select a category…"
          fullWidth
        />

        <Textarea
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Add context about this change order…"
        />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} loading={saving}>
            {categorizeOnly ? 'Save Category' : 'Approve Invoice'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
