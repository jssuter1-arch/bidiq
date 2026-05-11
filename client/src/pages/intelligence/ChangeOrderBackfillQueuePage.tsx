import { useEffect, useState } from 'react';
import { CheckSquare } from 'lucide-react';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate } from '@/utils/format';

const CO_CATEGORIES = [
  { value: '', label: '— Select category —' },
  { value: 'scope_creep', label: 'Scope Creep' },
  { value: 'design_change', label: 'Design Change' },
  { value: 'unforeseen_conditions', label: 'Unforeseen Conditions' },
  { value: 'material_escalation', label: 'Material Escalation' },
  { value: 'labor_shortage', label: 'Labor Shortage' },
  { value: 'permit_requirement', label: 'Permit Requirement' },
  { value: 'owner_request', label: 'Owner Request' },
  { value: 'error_omission', label: 'Error / Omission' },
  { value: 'other', label: 'Other' },
];

export default function ChangeOrderBackfillQueuePage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [rowCategories, setRowCategories] = useState<Record<string, string>>({});

  const load = () => {
    api.get('/v1/change-orders/queue?uncategorized=true')
      .then((r) => setInvoices(r.data.data || []))
      .catch(() => toast.error('Failed to load queue'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === invoices.length) setSelected(new Set());
    else setSelected(new Set(invoices.map((i) => i.id)));
  };

  const handleSingleCategorize = async (id: string) => {
    const cat = rowCategories[id];
    if (!cat) { toast.error('Select a category first'); return; }
    try {
      await api.patch(`/v1/change-orders/${id}/categorize`, { change_order_category: cat });
      toast.success('Categorized');
      setInvoices((prev) => prev.filter((i) => i.id !== id));
    } catch { toast.error('Failed to categorize'); }
  };

  const handleBulkCategorize = async () => {
    if (!bulkCategory) { toast.error('Select a bulk category'); return; }
    if (selected.size === 0) { toast.error('Select at least one invoice'); return; }
    setBulkSaving(true);
    try {
      const { data } = await api.post('/v1/change-orders/bulk-categorize', {
        ids: Array.from(selected),
        change_order_category: bulkCategory,
      });
      toast.success(`Categorized ${data.updated} invoices`);
      setInvoices((prev) => prev.filter((i) => !selected.has(i.id)));
      setSelected(new Set());
      setBulkCategory('');
    } catch { toast.error('Failed to bulk categorize'); }
    finally { setBulkSaving(false); }
  };

  return (
    <PageWrapper>
      <PageHeader
        title="Categorize Change Orders"
        subtitle={`${invoices.length} uncategorized change order${invoices.length !== 1 ? 's' : ''} require attention`}
      />

      <div className="flex items-center gap-2 mb-2">
        <input
          type="checkbox"
          checked={selected.size === invoices.length && invoices.length > 0}
          onChange={toggleAll}
          className="rounded"
          disabled={invoices.length === 0}
        />
        <span className="text-xs text-[var(--text-tertiary)]">
          {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
        </span>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-brand-500/10 border border-brand-500/20 rounded-lg mb-4">
          <span className="text-sm font-medium text-brand-400">{selected.size} selected</span>
          <Select
            options={CO_CATEGORIES}
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value)}
            placeholder="Bulk category…"
          />
          <Button size="sm" iconLeft={<CheckSquare className="w-3.5 h-3.5" />} onClick={handleBulkCategorize} loading={bulkSaving}>
            Apply to Selected
          </Button>
        </div>
      )}

      <Table
        loading={loading}
        data={invoices}
        emptyText="All change orders have been categorized."
        columns={[
          {
            key: 'select',
            header: '',
            render: (r: any) => <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} className="rounded" />,
          },
          { key: 'invoice_number', header: 'Invoice #', render: (r: any) => r.invoice_number || r.id.slice(0, 8) },
          { key: 'project', header: 'Project', render: (r: any) => r.projects?.name || '—' },
          { key: 'contractor', header: 'Contractor', render: (r: any) => r.contractors?.company_name || '—' },
          { key: 'invoice_date', header: 'Date', render: (r: any) => formatDate(r.invoice_date) },
          {
            key: 'total_amount',
            header: 'Amount',
            align: 'right',
            render: (r: any) => <span className="font-mono">{formatCurrency(r.total_amount)}</span>,
          },
          {
            key: 'status',
            header: 'Status',
            render: (r: any) => <Badge variant={r.status === 'approved' ? 'success' : 'default'}>{r.status}</Badge>,
          },
          {
            key: 'categorize',
            header: 'Category',
            render: (r: any) => (
              <div className="flex items-center gap-2">
                <Select
                  options={CO_CATEGORIES}
                  value={rowCategories[r.id] ?? ''}
                  onChange={(e) => setRowCategories((prev) => ({ ...prev, [r.id]: e.target.value }))}
                />
                <Button size="sm" variant="secondary" onClick={() => handleSingleCategorize(r.id)} disabled={!rowCategories[r.id]}>
                  Save
                </Button>
              </div>
            ),
          },
        ]}
      />
    </PageWrapper>
  );
}
