import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Download, ArrowLeft } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/utils/format';
import TemplatePDFExport from '@/components/pdf/TemplatePDFExport';

const UNIT_BASIS_OPTIONS = [
  { value: 'per_unit', label: 'Per Unit' },
  { value: 'per_sqft', label: 'Per Sqft' },
  { value: 'flat', label: 'Flat' },
  { value: 'per_linear_ft', label: 'Per Linear Ft' },
];

export default function PricingTemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState('');
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [newItem, setNewItem] = useState({ category: '', description: '', unit_basis: 'per_unit', unit_cost: '' });
  const [savingItem, setSavingItem] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    api.get(`/v1/pricing-templates/${id}`)
      .then((r) => {
        setTemplate(r.data.data);
        setNameVal(r.data.data.name);
      })
      .catch(() => toast.error('Failed to load template'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  const handleSaveName = async () => {
    if (!nameVal.trim()) return;
    try {
      await api.patch(`/v1/pricing-templates/${id}`, { name: nameVal });
      setTemplate((p: any) => ({ ...p, name: nameVal }));
      setEditingName(false);
      toast.success('Name updated');
    } catch { toast.error('Failed to update'); }
  };

  const handleAddItem = async () => {
    if (!newItem.category.trim() || !newItem.unit_cost) { toast.error('Category and unit cost are required'); return; }
    setSavingItem(true);
    try {
      await api.post(`/v1/pricing-templates/${id}/items`, {
        category: newItem.category.trim().toLowerCase().replace(/\s+/g, '_'),
        description: newItem.description || undefined,
        unit_basis: newItem.unit_basis,
        unit_cost: parseFloat(newItem.unit_cost),
      });
      toast.success('Item added');
      setAddItemOpen(false);
      setNewItem({ category: '', description: '', unit_basis: 'per_unit', unit_cost: '' });
      load();
    } catch { toast.error('Failed to add item'); }
    finally { setSavingItem(false); }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await api.delete(`/v1/pricing-templates/${id}/items/${itemId}`);
      toast.success('Item removed');
      setTemplate((p: any) => ({
        ...p,
        pricing_template_items: p.pricing_template_items.filter((i: any) => i.id !== itemId),
      }));
    } catch { toast.error('Failed to remove item'); }
  };

  if (loading) return <div className="flex h-40 items-center justify-center"><Spinner size="lg" /></div>;
  if (!template) return <PageWrapper><p className="text-[var(--text-secondary)]">Template not found.</p></PageWrapper>;

  const items = template.pricing_template_items ?? [];

  return (
    <PageWrapper>
      <PageHeader
        title={template.name}
        subtitle={template.description ?? 'Pricing template'}
        actions={
          <div className="flex items-center gap-2">
            <PDFDownloadLink
              document={<TemplatePDFExport template={template} />}
              fileName={`${template.name.replace(/\s+/g, '-').toLowerCase()}-template.pdf`}
              style={{ textDecoration: 'none' }}
            >
              <Button variant="ghost" size="sm" iconLeft={<Download className="w-3.5 h-3.5" />}>Export PDF</Button>
            </PDFDownloadLink>
            <Button variant="secondary" size="sm" iconLeft={<Plus className="w-3.5 h-3.5" />} onClick={() => setAddItemOpen(true)}>
              Add Line Item
            </Button>
          </div>
        }
      />

      <button
        onClick={() => navigate('/intelligence/templates')}
        className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Templates
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Template Info</h3>
            <Button variant="ghost" size="sm" onClick={() => setEditingName(true)}>Edit Name</Button>
          </div>
          {editingName ? (
            <div className="flex gap-2">
              <Input value={nameVal} onChange={(e) => setNameVal(e.target.value)} fullWidth />
              <Button size="sm" onClick={handleSaveName}>Save</Button>
              <Button variant="ghost" size="sm" onClick={() => setEditingName(false)}>Cancel</Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[var(--text-tertiary)] text-xs">Property Type</p>
                <p className="text-[var(--text-primary)]">{template.property_type || '—'}</p>
              </div>
              <div>
                <p className="text-[var(--text-tertiary)] text-xs">Renovation Scope</p>
                <p className="text-[var(--text-primary)] capitalize">{template.renovation_scope?.replace('_', ' ') || '—'}</p>
              </div>
              <div>
                <p className="text-[var(--text-tertiary)] text-xs">Status</p>
                <Badge variant={template.is_active ? 'success' : 'default'}>{template.is_active ? 'Active' : 'Inactive'}</Badge>
              </div>
              <div>
                <p className="text-[var(--text-tertiary)] text-xs">Total Items</p>
                <p className="text-[var(--text-primary)] font-medium">{items.length}</p>
              </div>
            </div>
          )}
        </Card>

        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Benchmark Comparison</h3>
          <p className="text-xs text-[var(--text-tertiary)]">
            Items shown with org benchmark — green means below market, red means above.
          </p>
          <div className="space-y-2">
            {items.filter((i: any) => i.benchmark?.avg_cost).slice(0, 5).map((i: any) => {
              const ratio = i.unit_cost / i.benchmark.avg_cost;
              const ok = ratio <= 1.1;
              return (
                <div key={i.id} className="flex justify-between text-xs">
                  <span className="capitalize text-[var(--text-secondary)]">{i.category.replace(/_/g, ' ')}</span>
                  <span className={ok ? 'text-green-500' : 'text-red-400'}>
                    {formatCurrency(i.unit_cost)} vs {formatCurrency(i.benchmark.avg_cost)}
                  </span>
                </div>
              );
            })}
            {items.filter((i: any) => i.benchmark?.avg_cost).length === 0 && (
              <p className="text-xs text-[var(--text-tertiary)]">No benchmark data available.</p>
            )}
          </div>
        </Card>
      </div>

      <Table
        data={items}
        loading={false}
        emptyText="No line items yet. Add items to make this template usable."
        columns={[
          { key: 'category', header: 'Category', render: (r: any) => <span className="capitalize font-medium">{r.category.replace(/_/g, ' ')}</span> },
          { key: 'description', header: 'Description', render: (r: any) => r.description || '—' },
          {
            key: 'unit_basis',
            header: 'Basis',
            render: (r: any) => <Badge variant="default">{r.unit_basis.replace('_', ' ')}</Badge>,
          },
          {
            key: 'unit_cost',
            header: 'Unit Cost',
            align: 'right',
            render: (r: any) => <span className="font-mono">{formatCurrency(r.unit_cost)}</span>,
          },
          {
            key: 'benchmark',
            header: 'Market Avg',
            align: 'right',
            render: (r: any) => r.benchmark?.avg_cost
              ? <span className="font-mono text-[var(--text-tertiary)]">{formatCurrency(r.benchmark.avg_cost)}</span>
              : '—',
          },
          {
            key: 'actions',
            header: '',
            render: (r: any) => (
              <Button variant="ghost" size="sm" iconLeft={<Trash2 className="w-3.5 h-3.5" />} onClick={() => handleDeleteItem(r.id)}>
                Remove
              </Button>
            ),
          },
        ]}
      />

      {addItemOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)] p-6 w-full max-w-md space-y-4">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Add Line Item</h3>
            <Input
              label="Category (snake_case)"
              value={newItem.category}
              onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value }))}
              placeholder="e.g. flooring"
              fullWidth
            />
            <Input
              label="Description (optional)"
              value={newItem.description}
              onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))}
              fullWidth
            />
            <Select
              label="Unit basis"
              options={UNIT_BASIS_OPTIONS}
              value={newItem.unit_basis}
              onChange={(e) => setNewItem((p) => ({ ...p, unit_basis: e.target.value }))}
              fullWidth
            />
            <Input
              label="Unit cost ($)"
              type="number"
              value={newItem.unit_cost}
              onChange={(e) => setNewItem((p) => ({ ...p, unit_cost: e.target.value }))}
              placeholder="0.00"
              fullWidth
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setAddItemOpen(false)} disabled={savingItem}>Cancel</Button>
              <Button onClick={handleAddItem} loading={savingItem}>Add Item</Button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
