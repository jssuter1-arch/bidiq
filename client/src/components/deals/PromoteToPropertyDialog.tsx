import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { AcquisitionDeal } from '@/types/deals';
import api from '@/services/api';

interface Props {
  deal: AcquisitionDeal;
  open: boolean;
  onClose: () => void;
}

export default function PromoteToPropertyDialog({ deal, open, onClose }: Props) {
  const navigate = useNavigate();
  const [propertyName, setPropertyName] = useState(deal.deal_name);
  const [createProject, setCreateProject] = useState(false);
  const [projectName, setProjectName] = useState(`${deal.deal_name} — Renovation`);
  const [initialBudget, setInitialBudget] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!propertyName.trim()) {
      setError('Property name is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, any> = {
        propertyName: propertyName.trim(),
        createInitialProject: createProject,
      };
      if (createProject) {
        payload.projectName = projectName.trim() || undefined;
        if (initialBudget > 0) payload.initialBudget = initialBudget;
      }
      const { data } = await api.post(`/v1/deals/${deal.id}/promote`, payload);
      onClose();
      navigate(`/properties/${data.data.property_id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to promote deal.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Promote Deal to Property" size="md">
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          This will create a new property record from the closed deal and link all associated documents.
        </p>

        <Input
          label="Property Name"
          value={propertyName}
          onChange={(e) => setPropertyName(e.target.value)}
          fullWidth
        />

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            className="rounded border-[var(--border-default)] text-brand-600"
            checked={createProject}
            onChange={(e) => setCreateProject(e.target.checked)}
          />
          <span className="text-sm text-[var(--text-primary)]">Create initial renovation project</span>
        </label>

        {createProject && (
          <div className="space-y-3 pl-6 border-l-2 border-[var(--border-subtle)]">
            <Input
              label="Project Name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              fullWidth
            />
            <CurrencyInput
              label="Initial Budget (optional)"
              value={initialBudget || ''}
              onChange={setInitialBudget}
              placeholder="Leave blank to use underwriting estimate"
              fullWidth
            />
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="success" loading={saving} onClick={handleSubmit}>
            Promote to Property
          </Button>
        </div>
      </div>
    </Modal>
  );
}
