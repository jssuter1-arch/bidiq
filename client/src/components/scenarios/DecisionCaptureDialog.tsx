import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import { cn } from '@/utils/cn';
import api from '@/services/api';

const REASON_CODES = [
  'Best NPV',
  'Best IRR',
  'Lowest Capital',
  'Lowest Risk',
  'Regulatory Forces It',
  'Owner Preference',
  'Other',
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  comparisonId: string;
  comparisonName: string;
  scenarioId: string;
  scenarioName: string;
}

export default function DecisionCaptureDialog({
  open, onClose, onSuccess, comparisonId, comparisonName, scenarioId, scenarioName,
}: Props) {
  const [notes, setNotes] = useState('');
  const [reasonCodes, setReasonCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleReason = (code: string) => {
    setReasonCodes((prev) =>
      prev.includes(code) ? prev.filter((r) => r !== code) : [...prev, code],
    );
  };

  const handleSubmit = async () => {
    if (!notes.trim()) { setError('Decision notes are required.'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post(`/v1/scenario-comparisons/${comparisonId}/decide`, {
        selectedScenarioId: scenarioId,
        decisionNotes: notes.trim(),
        reasonCodes,
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Failed to capture decision.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Capture Decision" size="md">
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          You are selecting <strong className="text-[var(--text-primary)]">{scenarioName}</strong> for{' '}
          <strong className="text-[var(--text-primary)]">{comparisonName}</strong>.
        </p>

        <Textarea
          label="Decision Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Why are you choosing this path?"
          rows={3}
          required
        />

        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">Reason Codes</p>
          <div className="flex flex-wrap gap-2">
            {REASON_CODES.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => toggleReason(code)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                  reasonCodes.includes(code)
                    ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                    : 'bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]',
                )}
              >
                {code}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading}>Capture Decision</Button>
        </div>
      </div>
    </Modal>
  );
}
