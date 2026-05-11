import { useEffect, useState } from 'react';
import { Plus, Pencil, Send, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { formatCurrency, formatDate, formatPercent } from '@/utils/format';

const STATUS_COLORS: Record<string, any> = { pending: 'default', submitted: 'info', approved: 'brand', funded: 'success', denied: 'danger' };

const blank = () => ({
  projectId: '',
  drawNumber: 1,
  title: '',
  requestedAmount: 0,
  submittedDate: '',
  completionPercentage: 0,
  lenderContact: '',
  notes: '',
});

export default function LoanDrawsPage() {
  const [draws, setDraws] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [approveAmount, setApproveAmount] = useState(0);
  const [approveSaving, setApproveSaving] = useState(false);

  const fetchDraws = () => {
    setLoading(true);
    api.get('/v1/loan-draws', { params: { limit: 100 } })
      .then((r) => setDraws(r.data.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDraws();
    api.get('/v1/projects', { params: { limit: 100 } }).then((r) => setProjects(r.data.data || []));
  }, []);

  const openAdd = () => { setEditItem(null); setForm(blank()); setModalOpen(true); };
  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      projectId: item.project_id || '',
      drawNumber: item.draw_number || 1,
      title: item.title || '',
      requestedAmount: item.requested_amount || 0,
      submittedDate: item.submitted_date || '',
      completionPercentage: item.completion_percentage || 0,
      lenderContact: item.lender_contact || '',
      notes: item.notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.projectId || !form.requestedAmount) return toast.error('Project and requested amount are required');
    setSaving(true);
    try {
      const payload: any = {
        projectId: form.projectId,
        drawNumber: form.drawNumber,
        requestedAmount: form.requestedAmount,
        title: form.title || undefined,
        submittedDate: form.submittedDate || undefined,
        completionPercentage: form.completionPercentage || undefined,
        lenderContact: form.lenderContact || undefined,
        notes: form.notes || undefined,
      };
      if (editItem) {
        await api.patch(`/v1/loan-draws/${editItem.id}`, payload);
        toast.success('Draw updated');
      } else {
        await api.post('/v1/loan-draws', payload);
        toast.success('Draw created');
      }
      setModalOpen(false);
      fetchDraws();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (id: string) => {
    try {
      await api.post(`/v1/loan-draws/${id}/submit`);
      toast.success('Draw submitted to lender');
      fetchDraws();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit draw');
    }
  };

  const handleApprove = async () => {
    if (!approveId || !approveAmount) return toast.error('Enter approved amount');
    setApproveSaving(true);
    try {
      await api.post(`/v1/loan-draws/${approveId}/approve`, { approvedAmount: approveAmount });
      toast.success('Draw approved');
      setApproveId(null);
      fetchDraws();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to approve');
    } finally {
      setApproveSaving(false);
    }
  };

  const totalRequested = draws.reduce((s, d) => s + (d.requested_amount || 0), 0);
  const totalFunded = draws.reduce((s, d) => s + (d.funded_amount || 0), 0);

  return (
    <PageWrapper>
      <PageHeader
        title="Loan Draws"
        subtitle={`${draws.length} draws · ${formatCurrency(totalFunded)} funded of ${formatCurrency(totalRequested)} requested`}
        actions={<Button iconLeft={<Plus className="w-4 h-4" />} onClick={openAdd}>New Draw</Button>}
      />
      <Table
        columns={[
          { key: 'projects', header: 'Project', render: (r: any) => r.projects?.name || '—' },
          { key: 'draw_number', header: '#', render: (r: any) => `Draw ${r.draw_number}` },
          { key: 'title', header: 'Title', render: (r: any) => r.title || '—' },
          { key: 'status', header: 'Status', render: (r: any) => <Badge size="sm" variant={STATUS_COLORS[r.status]}>{r.status}</Badge> },
          { key: 'requested_amount', header: 'Requested', align: 'right', render: (r: any) => <span className="font-mono">{formatCurrency(r.requested_amount)}</span> },
          { key: 'approved_amount', header: 'Approved', align: 'right', render: (r: any) => <span className="font-mono">{r.approved_amount ? formatCurrency(r.approved_amount) : '—'}</span> },
          { key: 'funded_amount', header: 'Funded', align: 'right', render: (r: any) => <span className="font-mono">{r.funded_amount ? formatCurrency(r.funded_amount) : '—'}</span> },
          { key: 'completion_percentage', header: '% Done', render: (r: any) => formatPercent(r.completion_percentage) },
          { key: 'submitted_date', header: 'Submitted', render: (r: any) => formatDate(r.submitted_date) },
          {
            key: 'actions', header: '', align: 'right', render: (r: any) => (
              <div className="flex gap-1 justify-end">
                <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors text-[var(--text-secondary)]" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                {r.status === 'pending' && (
                  <button onClick={() => handleSubmit(r.id)} className="p-1.5 rounded-lg hover:bg-brand-500/10 transition-colors text-brand-400" title="Submit to lender"><Send className="w-3.5 h-3.5" /></button>
                )}
                {r.status === 'submitted' && (
                  <button onClick={() => { setApproveId(r.id); setApproveAmount(r.requested_amount || 0); }} className="p-1.5 rounded-lg hover:bg-success/10 transition-colors text-success" title="Approve draw"><CheckCircle className="w-3.5 h-3.5" /></button>
                )}
              </div>
            )
          },
        ]}
        data={draws}
        loading={loading}
        emptyText="No loan draws"
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Draw' : 'New Draw Request'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Project" options={projects.map((p) => ({ value: p.id, label: p.name }))} placeholder="Select project" value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))} fullWidth />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--text-secondary)]">Draw #</label>
              <input
                type="number"
                min={1}
                value={form.drawNumber}
                onChange={(e) => setForm((f) => ({ ...f, drawNumber: parseInt(e.target.value) || 1 }))}
                className="w-full rounded-lg border bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-default)] focus:border-brand-500 focus:outline-none h-9 px-3 text-sm transition-colors"
              />
            </div>
          </div>
          <Input label="Title (optional)" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} fullWidth />
          <CurrencyInput label="Requested Amount" value={form.requestedAmount} onChange={(v) => setForm((f) => ({ ...f, requestedAmount: v }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Submitted Date" type="date" value={form.submittedDate} onChange={(e) => setForm((f) => ({ ...f, submittedDate: e.target.value }))} fullWidth />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--text-secondary)]">% Complete</label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.completionPercentage}
                onChange={(e) => setForm((f) => ({ ...f, completionPercentage: parseFloat(e.target.value) || 0 }))}
                className="w-full rounded-lg border bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-default)] focus:border-brand-500 focus:outline-none h-9 px-3 text-sm transition-colors"
              />
            </div>
          </div>
          <Input label="Lender Contact (optional)" value={form.lenderContact} onChange={(e) => setForm((f) => ({ ...f, lenderContact: e.target.value }))} fullWidth />
          <Textarea label="Notes (optional)" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} fullWidth />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editItem ? 'Save Changes' : 'Create Draw'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!approveId} onClose={() => setApproveId(null)} title="Approve Draw" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">Enter the amount approved by the lender.</p>
          <CurrencyInput label="Approved Amount" value={approveAmount} onChange={setApproveAmount} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setApproveId(null)}>Cancel</Button>
            <Button onClick={handleApprove} loading={approveSaving}>Approve</Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
