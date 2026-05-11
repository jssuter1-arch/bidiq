import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Copy, Trash2, FileText } from 'lucide-react';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import toast from 'react-hot-toast';
import { formatDate } from '@/utils/format';

const SCOPES = [
  { value: 'light', label: 'Light' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'heavy', label: 'Heavy' },
  { value: 'gut_rehab', label: 'Gut Rehab' },
];

export default function PricingTemplateLibraryPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', property_type: '', renovation_scope: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get('/v1/pricing-templates')
      .then((r) => setTemplates(r.data.data || []))
      .catch(() => toast.error('Failed to load templates'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const { data } = await api.post('/v1/pricing-templates', {
        name: form.name,
        description: form.description || undefined,
        property_type: form.property_type || undefined,
        renovation_scope: form.renovation_scope || undefined,
        is_active: true,
      });
      toast.success('Template created');
      setCreateOpen(false);
      setForm({ name: '', description: '', property_type: '', renovation_scope: '' });
      navigate(`/intelligence/templates/${data.data.id}`);
    } catch { toast.error('Failed to create template'); }
    finally { setSaving(false); }
  };

  const handleDuplicate = async (id: string, name: string) => {
    try {
      const { data } = await api.post(`/v1/pricing-templates/${id}/duplicate`);
      toast.success(`Duplicated "${name}"`);
      navigate(`/intelligence/templates/${data.data.id}`);
    } catch { toast.error('Failed to duplicate'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template? This cannot be undone.')) return;
    try {
      await api.delete(`/v1/pricing-templates/${id}`);
      toast.success('Template deleted');
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <PageWrapper>
      <PageHeader
        title="Pricing Templates"
        subtitle="Reusable scope-based cost templates for auto-budgeting"
        actions={
          <Button iconLeft={<Plus className="w-3.5 h-3.5" />} onClick={() => setCreateOpen(true)}>
            New Template
          </Button>
        }
      />

      <Table
        loading={loading}
        data={templates}
        emptyText="No templates yet. Create your first to speed up budget generation."
        columns={[
          {
            key: 'name',
            header: 'Name',
            render: (r: any) => (
              <button
                onClick={() => navigate(`/intelligence/templates/${r.id}`)}
                className="font-medium text-[var(--text-primary)] hover:text-brand-400 transition-colors text-left"
              >
                {r.name}
              </button>
            ),
          },
          { key: 'property_type', header: 'Property Type', render: (r: any) => r.property_type || '—' },
          {
            key: 'renovation_scope',
            header: 'Scope',
            render: (r: any) => r.renovation_scope
              ? <Badge variant="default">{r.renovation_scope.replace('_', ' ')}</Badge>
              : '—',
          },
          {
            key: 'items',
            header: 'Line Items',
            align: 'right',
            render: (r: any) => r.pricing_template_items?.[0]?.count ?? '—',
          },
          {
            key: 'is_active',
            header: 'Status',
            render: (r: any) => <Badge variant={r.is_active ? 'success' : 'default'}>{r.is_active ? 'Active' : 'Inactive'}</Badge>,
          },
          { key: 'created_at', header: 'Created', render: (r: any) => formatDate(r.created_at) },
          {
            key: 'actions',
            header: '',
            render: (r: any) => (
              <div className="flex items-center gap-1 justify-end">
                <Button variant="ghost" size="sm" iconLeft={<Copy className="w-3.5 h-3.5" />} onClick={() => handleDuplicate(r.id, r.name)}>
                  Duplicate
                </Button>
                <Button variant="ghost" size="sm" iconLeft={<Trash2 className="w-3.5 h-3.5" />} onClick={() => handleDelete(r.id)}>
                  Delete
                </Button>
              </div>
            ),
          },
        ]}
      />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Pricing Template" size="sm">
        <div className="space-y-4">
          <Input
            label="Template name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Standard Multifamily Rehab"
            fullWidth
          />
          <Input
            label="Description (optional)"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Brief description…"
            fullWidth
          />
          <Input
            label="Property type (optional)"
            value={form.property_type}
            onChange={(e) => setForm((p) => ({ ...p, property_type: e.target.value }))}
            placeholder="e.g. Multifamily, SFR"
            fullWidth
          />
          <Select
            label="Renovation scope (optional)"
            options={[{ value: '', label: '— None —' }, ...SCOPES]}
            value={form.renovation_scope}
            onChange={(e) => setForm((p) => ({ ...p, renovation_scope: e.target.value }))}
            fullWidth
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleCreate} loading={saving}>Create Template</Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
