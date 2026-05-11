import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import api from '@/services/api';

interface Props {
  dealId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MarkLostDialog({ dealId, open, onClose, onSuccess }: Props) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!reason.trim()) {
      setError('Please provide a reason.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.patch(`/v1/deals/${dealId}/status`, {
        to: 'closed_lost',
        closed_lost_reason: reason.trim(),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update status.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Mark Deal as Lost" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          This action is final. Please describe why the deal was lost.
        </p>
        <Textarea
          label="Reason for loss"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="e.g., Outbid at $2.1M by another buyer"
          error={error}
          fullWidth
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="danger" loading={saving} onClick={handleSubmit}>
            Mark as Lost
          </Button>
        </div>
      </div>
    </Modal>
  );
}
