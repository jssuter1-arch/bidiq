import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Table from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import toast from 'react-hot-toast';
import { formatPercent } from '@/utils/format';

export default function ScopeFactorsAdminPage() {
  const [factors, setFactors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ factor_key: '', display_name: '', adjustment_pct: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get('/v1/scope-factors')
      .then((r) => setFactors(r.data.data || []))
      .catch(() => toast.error('Failed to load scope factors'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleCreate = async () => {
    if (!form.factor_key.trim() || !form.display_name.trim()) {
      toast.error('Key and display name are required');
      return;
    }
    setSaving(true);
    try {
      await api.post('/v1/scope-factors', {
        factor_key: form.factor_key.trim().toLowerCase().replace(/\s+/g, '_'),
        display_name: form.display_name.trim(),
        adjustment_pct: form.adjustment_pct ? parseFloat(form.adjustment_pct) : undefined,
        notes: form.notes || undefined,
        is_active: true,
      });
      toast.success('Scope factor created');
      setCreateOpen(false);
      setForm({ factor_key: '', display_name: '', adjustment_pct: '', notes: '' });
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this scope factor?')) return;
    try {
      await api.delete(`/v1/scope-factors/${id}`);
      toast.success('Deleted');
      setFactors((prev) => prev.filter((f) => f.id !== id));
    } catch { toast.error('Failed to delete'); }
  };

  const handleToggle = async (id: string, currentlyActive: boolean) => {
    try {
      await api.patch(`/v1/scope-factors/${id}`, { is_active: !currentlyActive });
      setFactors((prev) => prev.map((f) => f.id === id ? { ...f, is_active: !currentlyActive } : f));
    } catch { toast.error('Failed to update'); }
  };

  return (
    <PageWrapper>
      <PageHeader
        title="Scope Factors"
        subtitle="Define conditions that adjust normalized contractor rates"
        actions={
          <Button iconLeft={<Plus className="w-3.5 h-3.5" />} onClick={() => setCreateOpen(true)}>
            Add Factor
          </Button>
        }
      />

      <Table
        loading={loading}
        data={factors}
        emptyText="No scope factors defined yet."
        columns={[
          { key: 'factor_key', header: 'Key', render: (r: any) => <code className="text-xs bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded">{r.factor_key}</code> },
          { key: 'display_name', header: 'Display Name' },
          {
            key: 'adjustment_pct',
            header: 'Rate Adjustment',
            align: 'right',
            render: (r: any) => r.adjustment_pct != null
              ? <span className="font-mono">{(r.adjustment_pct * 100).toFixed(1)}%</span>
              : '—',
          },
          { key: 'notes', header: 'Notes', render: (r: any) => r.notes || '—' },
          {
            key: 'is_active',
            header: 'Status',
            render: (r: any) => (
              <button onClick={() => handleToggle(r.id, r.is_active)}>
                <Badge variant={r.is_active ? 'success' : 'default'}>{r.is_active ? 'Active' : 'Inactive'}</Badge>
              </button>
            ),
          },
          {
            key: 'actions',
            header: '',
            render: (r: any) => (
              <Button variant="ghost" size="sm" iconLeft={<Trash2 className="w-3.5 h-3.5" />} onClick={() => handleDelete(r.id)}>
                Delete
              </Button>
            ),
          },
        ]}
      />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Scope Factor" size="sm">
        <div className="space-y-4">
          <Input
            label="Factor key (snake_case)"
            value={form.factor_key}
            onChange={(e) => setForm((p) => ({ ...p, factor_key: e.target.value }))}
            placeholder="e.g. occupied_building"
            fullWidth
          />
          <Input
            label="Display name"
            value={form.display_name}
            onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))}
            placeholder="e.g. Occupied Building"
            fullWidth
          />
          <Input
            label="Rate adjustment (decimal, e.g. 0.15 = 15% adjustment)"
            type="number"
            step="0.01"
            value={form.adjustment_pct}
            onChange={(e) => setForm((p) => ({ ...p, adjustment_pct: e.target.value }))}
            placeholder="0.00"
            fullWidth
          />
          <Input
            label="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            fullWidth
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleCreate} loading={saving}>Create Factor</Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
