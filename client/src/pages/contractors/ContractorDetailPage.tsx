import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Phone, Mail, AlertTriangle, Plus } from 'lucide-react';
import ContractorNormalizedRateCard from '@/components/change-orders/ContractorNormalizedRateCard';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import toast from 'react-hot-toast';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Skeleton from '@/components/ui/Skeleton';
import Tooltip from '@/components/ui/Tooltip';
import YardiBadge from '@/components/ui/YardiBadge';
import { formatCurrency, formatDate } from '@/utils/format';

const NOTE_TYPES = ['general','performance','issue','recommendation','reference'] as const;

function overpayFlags(invoice: any, avgInvoice: number): string[] {
  const flags: string[] = [];
  const lineItem = invoice.budget_line_items;
  if (lineItem?.budgeted_amount && invoice.total_amount > lineItem.budgeted_amount * 1.1) {
    flags.push(`${Math.round(((invoice.total_amount / lineItem.budgeted_amount) - 1) * 100)}% over line item budget`);
  }
  if (avgInvoice > 0 && invoice.total_amount > avgInvoice * 1.75) {
    flags.push(`${Math.round((invoice.total_amount / avgInvoice) * 10) / 10}× contractor average`);
  }
  return flags;
}

export default function ContractorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasAccess } = useModuleAccess();
  const [contractor, setContractor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState<typeof NOTE_TYPES[number]>('general');
  const [noteSaving, setNoteSaving] = useState(false);

  const fetchContractor = () => {
    api.get(`/v1/contractors/${id}`)
      .then((r) => setContractor(r.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchContractor(); }, [id]);

  const handleAddNote = async () => {
    if (!noteContent.trim()) return toast.error('Note content is required');
    setNoteSaving(true);
    try {
      await api.post(`/v1/contractors/${id}/notes`, { content: noteContent, noteType });
      toast.success('Note added');
      setNoteModalOpen(false);
      setNoteContent('');
      setNoteType('general');
      fetchContractor();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add note');
    } finally {
      setNoteSaving(false);
    }
  };

  if (loading) return <PageWrapper><Skeleton className="h-8 w-48" count={3} /></PageWrapper>;
  if (!contractor) return <PageWrapper><p className="text-[var(--text-secondary)]">Contractor not found</p></PageWrapper>;

  const invoices: any[] = contractor.contractor_invoices || [];
  const notes: any[] = contractor.contractor_notes || [];
  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total_amount, 0);
  const avgInvoice = invoices.length > 0 ? invoices.reduce((s, i) => s + i.total_amount, 0) / invoices.length : 0;
  const overpayCount = invoices.filter((i) => overpayFlags(i, avgInvoice).length > 0).length;

  return (
    <PageWrapper>
      <PageHeader
        title={contractor.company_name}
        subtitle={contractor.contact_name}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" iconLeft={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/contractors')}>Back</Button>
            <Button variant="secondary" onClick={() => navigate(`/contractors/${id}/edit`)}>Edit</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Rate Card</h3>
            {contractor.default_rate && (
              <Badge variant="brand" size="md">
                ${contractor.default_rate}/{contractor.rate_type || 'hr'}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: 'License', value: contractor.license_number || '—' },
              { label: 'License Expiry', value: formatDate(contractor.license_expiry) },
              { label: 'Insurance Expiry', value: formatDate(contractor.insurance_expiry) },
              { label: 'Rate Type', value: contractor.rate_type ? <span className="capitalize">{contractor.rate_type.replace('_', ' ')}</span> : '—' },
              { label: 'Total Paid', value: <span className="font-mono">{formatCurrency(totalPaid)}</span> },
              { label: 'Avg Invoice', value: <span className="font-mono">{avgInvoice > 0 ? formatCurrency(avgInvoice) : '—'}</span> },
              { label: 'Yardi ID', value: contractor.yardi_vendor_id ? <span className="flex items-center gap-1">{contractor.yardi_vendor_id} <YardiBadge /></span> : '—' },
              { label: 'Overpay Flags', value: overpayCount > 0
                ? <Badge variant="warning" dot>{overpayCount} invoice{overpayCount > 1 ? 's' : ''}</Badge>
                : <Badge variant="success" dot>None</Badge>
              },
            ].map((d) => (
              <div key={d.label}>
                <p className="text-xs text-[var(--text-tertiary)]">{d.label}</p>
                <p className="font-medium text-[var(--text-primary)]">{d.value}</p>
              </div>
            ))}
          </div>
          {contractor.specialties?.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {contractor.specialties.map((s: string) => <Badge key={s} size="sm" variant="brand" className="capitalize">{s.replace('_', ' ')}</Badge>)}
            </div>
          )}
        </Card>

        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Contact</h3>
          <div className="space-y-2 text-sm">
            {contractor.email && <div className="flex items-center gap-2 text-[var(--text-secondary)]"><Mail className="w-3.5 h-3.5" />{contractor.email}</div>}
            {contractor.phone && <div className="flex items-center gap-2 text-[var(--text-secondary)]"><Phone className="w-3.5 h-3.5" />{contractor.phone}</div>}
            {contractor.city && <p className="text-[var(--text-tertiary)]">{contractor.city}, {contractor.state}</p>}
            {contractor.rating && (
              <div className="flex items-center gap-1 pt-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < contractor.rating ? 'text-warning fill-warning' : 'text-[var(--text-disabled)]'}`} />
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recent Invoices</h3>
          {overpayCount > 0 && (
            <Badge variant="warning" size="sm" dot>{overpayCount} overpay flag{overpayCount > 1 ? 's' : ''}</Badge>
          )}
        </div>
        <Table
          columns={[
            { key: 'projects', header: 'Project', render: (r: any) => r.projects?.name || '—' },
            { key: 'budget_line_items', header: 'Line Item', render: (r: any) => r.budget_line_items
              ? <span className="capitalize text-xs">{r.budget_line_items.category?.replace('_', ' ')}</span>
              : '—'
            },
            { key: 'invoice_date', header: 'Date', render: (r: any) => formatDate(r.invoice_date) },
            { key: 'total_amount', header: 'Amount', align: 'right', render: (r: any) => (
              <span className="font-mono">{formatCurrency(r.total_amount)}</span>
            )},
            { key: 'status', header: 'Status', render: (r: any) => (
              <Badge size="sm" variant={r.status === 'paid' ? 'success' : 'warning'}>{r.status}</Badge>
            )},
            { key: 'flags', header: 'Overpay', render: (r: any) => {
              const flags = overpayFlags(r, avgInvoice);
              if (flags.length === 0) return null;
              return (
                <Tooltip content={flags.join(' · ')}>
                  <span className="flex items-center gap-1 text-warning cursor-help">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span className="text-xs">Flag</span>
                  </span>
                </Tooltip>
              );
            }},
          ]}
          data={invoices.slice(0, 10)}
          emptyText="No invoices"
        />
      </Card>

      {hasAccess('cost_intelligence_extended') && id && (
        <ContractorNormalizedRateCard contractorId={id} />
      )}

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Notes</h3>
          <Button size="sm" variant="ghost" iconLeft={<Plus className="w-3.5 h-3.5" />} onClick={() => setNoteModalOpen(true)}>Add Note</Button>
        </div>
        {notes.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">No notes yet</p>
        ) : (
          notes.map((note: any) => (
            <div key={note.id} className="p-3 rounded-lg bg-[var(--bg-elevated)] space-y-1">
              <div className="flex items-center gap-2">
                <Badge size="sm" className="capitalize">{note.note_type}</Badge>
                <span className="text-xs text-[var(--text-tertiary)]">{formatDate(note.created_at)}</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">{note.content}</p>
            </div>
          ))
        )}
      </Card>

      <Modal open={noteModalOpen} onClose={() => setNoteModalOpen(false)} title="Add Note" size="sm">
        <div className="space-y-3">
          <Select
            label="Note Type"
            options={NOTE_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
            value={noteType}
            onChange={(e) => setNoteType(e.target.value as typeof NOTE_TYPES[number])}
            fullWidth
          />
          <Textarea
            label="Content"
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            fullWidth
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setNoteModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddNote} loading={noteSaving}>Add Note</Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
