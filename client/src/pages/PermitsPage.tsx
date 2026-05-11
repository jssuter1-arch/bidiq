import { useEffect, useState } from 'react';
import { AlertTriangle, Plus, Pencil, Trash2 } from 'lucide-react';
import { differenceInDays } from 'date-fns';
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
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatCurrency, formatDate } from '@/utils/format';

const PERMIT_TYPES = ['building','electrical','plumbing','mechanical','demolition','certificate_of_occupancy'] as const;
const PERMIT_STATUSES = ['not_started','applied','under_review','approved','active','inspection_required','expired','denied','closed'] as const;

function ExpiryCell({ date }: { date: string | null }) {
  if (!date) return <span className="text-[var(--text-tertiary)]">—</span>;
  const days = differenceInDays(new Date(date), new Date());
  if (days < 0) return <span className="text-danger font-medium">Expired</span>;
  if (days <= 30) return <span className="text-warning font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{formatDate(date)} ({days}d)</span>;
  return <span>{formatDate(date)}</span>;
}

const blank = () => ({
  projectId: '',
  propertyId: '',
  permitType: '' as typeof PERMIT_TYPES[number] | '',
  permitNumber: '',
  issuingAuthority: '',
  description: '',
  status: 'not_started' as typeof PERMIT_STATUSES[number],
  appliedDate: '',
  issueDate: '',
  expiryDate: '',
  feeAmount: 0,
  notes: '',
});

export default function PermitsPage() {
  const [permits, setPermits] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchPermits = () => {
    setLoading(true);
    api.get('/v1/permits', { params: { limit: 100 } })
      .then((r) => setPermits(r.data.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPermits();
    Promise.all([
      api.get('/v1/projects', { params: { limit: 100 } }),
      api.get('/v1/properties', { params: { limit: 100 } }),
    ]).then(([p, prop]) => {
      setProjects(p.data.data || []);
      setProperties(prop.data.data || []);
    });
  }, []);

  const openAdd = () => { setEditItem(null); setForm(blank()); setModalOpen(true); };
  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      projectId: item.project_id || '',
      propertyId: item.property_id || '',
      permitType: item.permit_type || '',
      permitNumber: item.permit_number || '',
      issuingAuthority: item.issuing_authority || '',
      description: item.description || '',
      status: item.status || 'not_started',
      appliedDate: item.applied_date || '',
      issueDate: item.issue_date || '',
      expiryDate: item.expiry_date || '',
      feeAmount: item.fee_amount || 0,
      notes: item.notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.permitType || !form.projectId || !form.propertyId) {
      return toast.error('Permit type, project, and property are required');
    }
    setSaving(true);
    try {
      const payload: any = {
        permitType: form.permitType,
        projectId: form.projectId,
        propertyId: form.propertyId,
        status: form.status,
        permitNumber: form.permitNumber || undefined,
        issuingAuthority: form.issuingAuthority || undefined,
        description: form.description || undefined,
        appliedDate: form.appliedDate || undefined,
        issueDate: form.issueDate || undefined,
        expiryDate: form.expiryDate || undefined,
        feeAmount: form.feeAmount || undefined,
        notes: form.notes || undefined,
      };
      if (editItem) {
        await api.patch(`/v1/permits/${editItem.id}`, payload);
        toast.success('Permit updated');
      } else {
        await api.post('/v1/permits', payload);
        toast.success('Permit added');
      }
      setModalOpen(false);
      fetchPermits();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/v1/permits/${id}`);
      toast.success('Permit deleted');
      setPermits((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    } finally {
      setDeleteId(null);
    }
  };

  const expiring = permits.filter((p) => p.expiry_date && differenceInDays(new Date(p.expiry_date), new Date()) <= 30 && p.status !== 'closed');

  return (
    <PageWrapper>
      <PageHeader
        title="Permits"
        subtitle={`${permits.length} permits${expiring.length > 0 ? ` · ${expiring.length} expiring soon` : ''}`}
        actions={<Button iconLeft={<Plus className="w-4 h-4" />} onClick={openAdd}>Add Permit</Button>}
      />
      {expiring.length > 0 && (
        <div className="rounded-xl border border-warning/20 bg-warning-bg p-4 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
          <p className="text-sm text-warning">{expiring.length} permit{expiring.length > 1 ? 's' : ''} expiring within 30 days. Schedule inspections now.</p>
        </div>
      )}
      <Table
        columns={[
          { key: 'permit_type', header: 'Type', render: (r: any) => <span className="capitalize">{r.permit_type?.replace(/_/g, ' ')}</span> },
          { key: 'projects', header: 'Project', render: (r: any) => r.projects?.name || '—' },
          { key: 'permit_number', header: 'Permit #', render: (r: any) => r.permit_number || 'Pending' },
          { key: 'issuing_authority', header: 'Authority', render: (r: any) => r.issuing_authority || '—' },
          { key: 'status', header: 'Status', render: (r: any) => <Badge size="sm" variant={r.status === 'active' ? 'success' : r.status === 'expired' ? 'danger' : r.status === 'approved' ? 'info' : 'default'}>{r.status?.replace(/_/g, ' ')}</Badge> },
          { key: 'issue_date', header: 'Issued', render: (r: any) => formatDate(r.issue_date) },
          { key: 'expiry_date', header: 'Expires', render: (r: any) => <ExpiryCell date={r.expiry_date} /> },
          { key: 'fee_amount', header: 'Fee', align: 'right', render: (r: any) => <span className="font-mono">{formatCurrency(r.fee_amount)}</span> },
          {
            key: 'actions', header: '', align: 'right', render: (r: any) => (
              <div className="flex gap-1 justify-end">
                <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors text-[var(--text-secondary)]"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteId(r.id)} className="p-1.5 rounded-lg hover:bg-danger/10 transition-colors text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            )
          },
        ]}
        data={permits}
        loading={loading}
        emptyText="No permits"
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Permit' : 'Add Permit'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Project" options={projects.map((p) => ({ value: p.id, label: p.name }))} placeholder="Select project" value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))} fullWidth />
            <Select label="Property" options={properties.map((p) => ({ value: p.id, label: p.name }))} placeholder="Select property" value={form.propertyId} onChange={(e) => setForm((f) => ({ ...f, propertyId: e.target.value }))} fullWidth />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Permit Type"
              options={PERMIT_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))}
              placeholder="Select type"
              value={form.permitType}
              onChange={(e) => setForm((f) => ({ ...f, permitType: e.target.value as any }))}
              fullWidth
            />
            <Select
              label="Status"
              options={PERMIT_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))}
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}
              fullWidth
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Permit Number" placeholder="Optional" value={form.permitNumber} onChange={(e) => setForm((f) => ({ ...f, permitNumber: e.target.value }))} fullWidth />
            <Input label="Issuing Authority" placeholder="e.g. City of Boston" value={form.issuingAuthority} onChange={(e) => setForm((f) => ({ ...f, issuingAuthority: e.target.value }))} fullWidth />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Applied Date" type="date" value={form.appliedDate} onChange={(e) => setForm((f) => ({ ...f, appliedDate: e.target.value }))} fullWidth />
            <Input label="Issue Date" type="date" value={form.issueDate} onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))} fullWidth />
            <Input label="Expiry Date" type="date" value={form.expiryDate} onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))} fullWidth />
          </div>
          <CurrencyInput label="Fee Amount (optional)" value={form.feeAmount} onChange={(v) => setForm((f) => ({ ...f, feeAmount: v }))} />
          <Textarea label="Notes (optional)" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} fullWidth />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editItem ? 'Save Changes' : 'Add Permit'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        onClose={() => setDeleteId(null)}
        title="Delete Permit"
        message="This will permanently remove this permit record."
        confirmLabel="Delete"
        danger
      />
    </PageWrapper>
  );
}
