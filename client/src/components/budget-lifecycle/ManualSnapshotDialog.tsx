import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import api from '@/services/api';

interface Props {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManualSnapshotDialog({ projectId, open, onClose, onSuccess }: Props) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!notes.trim()) {
      setError('Notes are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post(`/v1/projects/${projectId}/snapshots`, { notes: notes.trim() });
      setNotes('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Failed to record snapshot.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Record Manual Snapshot">
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          This captures the current budget, spend, and change-order totals as a point-in-time record.
        </p>
        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Reason for this snapshot…"
          rows={3}
          required
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading}>Save Snapshot</Button>
        </div>
      </div>
    </Modal>
  );
}
