import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import CurrencyInput from '@/components/ui/CurrencyInput';
import ProgressBar from '@/components/ui/ProgressBar';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatCurrency } from '@/utils/format';

const CATEGORIES = [
  'demolition','framing','roofing','electrical','plumbing','hvac','insulation',
  'drywall','flooring','tile','painting','cabinets','appliances','windows_doors',
  'landscaping','permits','general_conditions','contingency',
] as const;

const STATUSES = ['pending','in_progress','completed','cancelled'] as const;

const blank = () => ({
  category: '' as typeof CATEGORIES[number] | '',
  description: '',
  budgetedAmount: 0,
  status: 'pending' as typeof STATUSES[number],
  contractorId: '',
  notes: '',
});

export default function BudgetPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get('/v1/projects', { params: { limit: 100 } }),
      api.get('/v1/contractors', { params: { limit: 100 } }),
    ]).then(([p, c]) => {
      setProjects(p.data.data || []);
      setContractors(c.data.data || []);
    });
  }, []);

  const fetchItems = (projectId: string) => {
    setLoading(true);
    api.get('/v1/line-items', { params: { projectId, limit: 200 } })
      .then((r) => setLineItems(r.data.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!selectedProject) return;
    fetchItems(selectedProject);
  }, [selectedProject]);

  const openAdd = () => { setEditItem(null); setForm(blank()); setModalOpen(true); };
  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      category: item.category || '',
      description: item.description || '',
      budgetedAmount: item.budgeted_amount || 0,
      status: item.status || 'pending',
      contractorId: item.contractor_id || '',
      notes: item.notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.category || !form.description) return toast.error('Category and description are required');
    setSaving(true);
    try {
      const payload: any = {
        category: form.category,
        description: form.description,
        budgetedAmount: form.budgetedAmount,
        status: form.status,
        notes: form.notes || undefined,
        contractorId: form.contractorId || undefined,
      };
      if (editItem) {
        await api.patch(`/v1/line-items/${editItem.id}`, payload);
        toast.success('Line item updated');
      } else {
        await api.post('/v1/line-items', { ...payload, projectId: selectedProject });
        toast.success('Line item added');
      }
      setModalOpen(false);
      fetchItems(selectedProject);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/v1/line-items/${id}`);
      toast.success('Line item deleted');
      setLineItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    } finally {
      setDeleteId(null);
    }
  };

  const totalBudget = lineItems.reduce((s, i) => s + (i.budgeted_amount || 0), 0);
  const totalActual = lineItems.reduce((s, i) => s + (i.actual_amount || 0), 0);

  return (
    <PageWrapper>
      <PageHeader
        title="Budget Tracking"
        subtitle="Line items and spend by project"
        actions={selectedProject ? <Button iconLeft={<Plus className="w-4 h-4" />} onClick={openAdd}>Add Line Item</Button> : undefined}
      />
      <Select
        label="Select Project"
        options={projects.map((p) => ({ value: p.id, label: p.name }))}
        placeholder="Choose a project"
        value={selectedProject}
        onChange={(e) => setSelectedProject(e.target.value)}
        className="max-w-sm"
      />
      {selectedProject && (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Budget', value: formatCurrency(totalBudget) },
              { label: 'Total Spent', value: formatCurrency(totalActual) },
              { label: 'Remaining', value: formatCurrency(totalBudget - totalActual) },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 space-y-1">
                <p className="text-xs text-[var(--text-tertiary)]">{s.label}</p>
                <p className="text-xl font-mono font-semibold text-[var(--text-primary)]">{s.value}</p>
              </div>
            ))}
          </div>
          {totalBudget > 0 && <ProgressBar value={(totalActual / totalBudget) * 100} showLabel size="md" />}
          <Table
            columns={[
              { key: 'category', header: 'Category', render: (r: any) => <span className="capitalize">{r.category?.replace(/_/g, ' ')}</span> },
              { key: 'description', header: 'Description' },
              { key: 'contractors', header: 'Contractor', render: (r: any) => r.contractors?.company_name || '—' },
              { key: 'status', header: 'Status', render: (r: any) => <Badge size="sm" variant={r.status === 'completed' ? 'success' : r.status === 'in_progress' ? 'info' : 'default'}>{r.status?.replace('_', ' ')}</Badge> },
              { key: 'budgeted_amount', header: 'Budget', align: 'right', render: (r: any) => <span className="font-mono">{formatCurrency(r.budgeted_amount)}</span> },
              { key: 'committed_amount', header: 'Committed', align: 'right', render: (r: any) => <span className="font-mono">{formatCurrency(r.committed_amount)}</span> },
              { key: 'actual_amount', header: 'Actual', align: 'right', render: (r: any) => <span className="font-mono">{formatCurrency(r.actual_amount)}</span> },
              {
                key: 'actions', header: '', align: 'right', render: (r: any) => (
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors text-[var(--text-secondary)]"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteId(r.id)} className="p-1.5 rounded-lg hover:bg-danger/10 transition-colors text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )
              },
            ]}
            data={lineItems}
            loading={loading}
            emptyText="No line items — add one above"
          />
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Line Item' : 'Add Line Item'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              options={CATEGORIES.map((c) => ({ value: c, label: c.replace(/_/g, ' ') }))}
              placeholder="Select category"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as any }))}
              fullWidth
            />
            <Select
              label="Status"
              options={STATUSES.map((s) => ({ value: s, label: s.replace('_', ' ') }))}
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}
              fullWidth
            />
          </div>
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            fullWidth
          />
          <CurrencyInput
            label="Budgeted Amount"
            value={form.budgetedAmount}
            onChange={(v) => setForm((f) => ({ ...f, budgetedAmount: v }))}
          />
          <Select
            label="Contractor (optional)"
            options={contractors.map((c) => ({ value: c.id, label: c.company_name }))}
            placeholder="Select contractor"
            value={form.contractorId}
            onChange={(e) => setForm((f) => ({ ...f, contractorId: e.target.value }))}
            fullWidth
          />
          <Textarea
            label="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            fullWidth
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editItem ? 'Save Changes' : 'Add Line Item'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onClose={() => setDeleteId(null)}
        title="Delete Line Item"
        message="This will permanently remove this line item. This action cannot be undone."
        confirmLabel="Delete"
        danger
      />
    </PageWrapper>
  );
}
