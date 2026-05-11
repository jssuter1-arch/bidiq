import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, FileText, Plus, Pencil, Download, GitBranch, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Tabs from '@/components/ui/Tabs';
import Badge from '@/components/ui/Badge';
import Table from '@/components/ui/Table';
import Skeleton from '@/components/ui/Skeleton';
import Modal from '@/components/ui/Modal';
import FileUpload from '@/components/ui/FileUpload';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import CurrencyInput from '@/components/ui/CurrencyInput';
import YardiBadge from '@/components/ui/YardiBadge';
import ConstraintMiniTable from '@/components/scenarios/ConstraintMiniTable';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { formatCurrency, formatDate } from '@/utils/format';
import type { Constraint } from '@/types/scenarios';

const DOC_TYPES = ['deed','survey','appraisal','inspection','insurance','permit','contract','invoice','photo','plan','other'] as const;

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'units', label: 'Units' },
  { id: 'projects', label: 'Projects' },
  { id: 'documents', label: 'Documents' },
];

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasAccess } = useModuleAccess();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [constraintsOpen, setConstraintsOpen] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [editUnit, setEditUnit] = useState<any>(null);
  const [unitForm, setUnitForm] = useState({ unitNumber: '', bedrooms: 1, bathrooms: 1, squareFeet: 0, status: 'vacant', currentRent: 0, marketRent: 0, tenantName: '', leaseStart: '', leaseEnd: '' });
  const [unitSaving, setUnitSaving] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<string>('other');
  const [docName, setDocName] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.get(`/v1/properties/${id}/summary`)
      .then((r) => setProperty(r.data.data))
      .finally(() => setLoading(false));
  }, [id]);

  const loadDocs = useCallback(() => {
    setDocsLoading(true);
    api.get('/v1/documents', { params: { propertyId: id } })
      .then((r) => setDocuments(r.data.data || []))
      .finally(() => setDocsLoading(false));
  }, [id]);

  const loadConstraints = useCallback(() => {
    if (!hasAccess('scenario_modeling')) return;
    api.get('/v1/constraints', { params: { propertyId: id } })
      .then((r) => setConstraints(r.data.data ?? []))
      .catch(() => {});
  }, [id, hasAccess]);

  useEffect(() => {
    if (tab === 'documents') loadDocs();
  }, [tab, loadDocs]);

  useEffect(() => { loadConstraints(); }, [loadConstraints]);

  const handleUpload = async () => {
    if (!uploadFile) return toast.error('Select a file first');
    if (!docName.trim()) return toast.error('Enter a document name');
    setUploading(true);
    try {
      const initRes = await api.post('/v1/documents/upload-init', {
        propertyId: id,
        fileName: uploadFile.name,
        fileSize: uploadFile.size,
        mimeType: uploadFile.type,
      });
      const { signedUrl, storagePath } = initRes.data.data;

      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        body: uploadFile,
        headers: { 'Content-Type': uploadFile.type },
      });
      if (!uploadRes.ok) throw new Error('Storage upload failed');

      await api.post('/v1/documents', {
        propertyId: id,
        name: docName,
        documentType: docType,
        storagePath,
        fileName: uploadFile.name,
        fileSize: uploadFile.size,
        mimeType: uploadFile.type,
      });

      toast.success('Document uploaded');
      setUploadModalOpen(false);
      setUploadFile(null);
      setDocName('');
      setDocType('other');
      loadDocs();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const refreshProperty = () => {
    api.get(`/v1/properties/${id}/summary`).then((r) => setProperty(r.data.data));
  };

  const openAddUnit = () => {
    setEditUnit(null);
    setUnitForm({ unitNumber: '', bedrooms: 1, bathrooms: 1, squareFeet: 0, status: 'vacant', currentRent: 0, marketRent: 0, tenantName: '', leaseStart: '', leaseEnd: '' });
    setUnitModalOpen(true);
  };

  const openEditUnit = (unit: any) => {
    setEditUnit(unit);
    setUnitForm({
      unitNumber: unit.unit_number || '',
      bedrooms: unit.bedrooms || 1,
      bathrooms: unit.bathrooms || 1,
      squareFeet: unit.square_feet || 0,
      status: unit.status || 'vacant',
      currentRent: unit.current_rent || 0,
      marketRent: unit.market_rent || 0,
      tenantName: unit.tenant_name || '',
      leaseStart: unit.lease_start || '',
      leaseEnd: unit.lease_end || '',
    });
    setUnitModalOpen(true);
  };

  const handleSaveUnit = async () => {
    if (!unitForm.unitNumber) return toast.error('Unit number is required');
    setUnitSaving(true);
    try {
      const payload: any = {
        unitNumber: unitForm.unitNumber,
        bedrooms: unitForm.bedrooms,
        bathrooms: unitForm.bathrooms,
        squareFeet: unitForm.squareFeet || undefined,
        status: unitForm.status,
        currentRent: unitForm.currentRent || undefined,
        marketRent: unitForm.marketRent || undefined,
        tenantName: unitForm.tenantName || undefined,
        leaseStart: unitForm.leaseStart || undefined,
        leaseEnd: unitForm.leaseEnd || undefined,
      };
      if (editUnit) {
        await api.patch(`/v1/units/${editUnit.id}`, payload);
        toast.success('Unit updated');
      } else {
        await api.post('/v1/units', { ...payload, propertyId: id });
        toast.success('Unit added');
      }
      setUnitModalOpen(false);
      refreshProperty();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save unit');
    } finally {
      setUnitSaving(false);
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      await api.delete(`/v1/documents/${docId}`);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      toast.success('Document deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (loading) return <PageWrapper><Skeleton className="h-8 w-48" count={3} /></PageWrapper>;
  if (!property) return <PageWrapper><p className="text-[var(--text-secondary)]">Property not found</p></PageWrapper>;

  const equity = property.current_value && property.purchase_price
    ? property.current_value - property.purchase_price
    : null;

  return (
    <PageWrapper>
      <PageHeader
        title={property.name}
        subtitle={`${property.address}, ${property.city}, ${property.state} ${property.zip}`}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" iconLeft={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/properties')}>
              Back
            </Button>
            <Button variant="secondary" iconLeft={<Edit className="w-4 h-4" />} onClick={() => navigate(`/properties/${id}/edit`)}>
              Edit
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Purchase Price', value: formatCurrency(property.purchase_price) },
          { label: 'Current Value', value: formatCurrency(property.current_value) },
          { label: 'Equity Gain', value: equity ? formatCurrency(equity) : '—' },
          { label: 'Unit Count', value: property.unit_count },
        ].map((s) => (
          <Card key={s.label} className="space-y-1">
            <p className="text-xs text-[var(--text-tertiary)]">{s.label}</p>
            <p className="text-lg font-mono font-semibold text-[var(--text-primary)]">{s.value}</p>
          </Card>
        ))}
      </div>

      <Tabs tabs={TABS.map((t) => ({
        ...t,
        count: t.id === 'units' ? property.units?.length
          : t.id === 'projects' ? property.projects?.length
          : t.id === 'documents' ? documents.length || undefined
          : undefined,
      }))} active={tab} onChange={setTab} />

      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Details</h3>
              <dl className="space-y-2">
                {[
                  { label: 'Type', value: property.property_type?.replace('_', ' ') },
                  { label: 'Status', value: <Badge variant="success" dot size="sm">{property.status?.replace('_', ' ')}</Badge> },
                  { label: 'Purchase Date', value: formatDate(property.purchase_date) },
                  { label: 'Yardi ID', value: property.yardi_property_id ? <span className="flex items-center gap-1">{property.yardi_property_id} <YardiBadge /></span> : '—' },
                ].map((d) => (
                  <div key={d.label} className="flex justify-between text-sm">
                    <dt className="text-[var(--text-tertiary)]">{d.label}</dt>
                    <dd className="text-[var(--text-primary)] font-medium capitalize">{d.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            {property.notes && (
              <Card className="space-y-2">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Notes</h3>
                <p className="text-sm text-[var(--text-secondary)]">{property.notes}</p>
              </Card>
            )}
          </div>

          {hasAccess('scenario_modeling') && (
            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-brand-400" />
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Constraints</h3>
                  {constraints.length > 0 && (
                    <span className="text-xs text-[var(--text-tertiary)]">({constraints.length})</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    iconLeft={<GitBranch className="w-3.5 h-3.5" />}
                    onClick={() => navigate(`/scenarios/new?propertyId=${id}`)}
                  >
                    Run Scenario
                  </Button>
                  <button
                    onClick={() => setConstraintsOpen((o) => !o)}
                    className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors text-[var(--text-tertiary)]"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${constraintsOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>
              {constraintsOpen && (
                <ConstraintMiniTable
                  constraints={constraints}
                  propertyId={id}
                  canWrite
                  onRefresh={loadConstraints}
                />
              )}
            </Card>
          )}
        </>
      )}

      {tab === 'units' && (
        <>
          <div className="flex justify-end">
            <Button size="sm" iconLeft={<Plus className="w-3.5 h-3.5" />} onClick={openAddUnit}>Add Unit</Button>
          </div>
          <Table
            columns={[
              { key: 'unit_number', header: 'Unit' },
              { key: 'status', header: 'Status', render: (r) => <Badge variant={r.status === 'occupied' ? 'success' : r.status === 'vacant' ? 'warning' : 'info'} size="sm" dot>{r.status}</Badge> },
              { key: 'bedrooms', header: 'Bed/Bath', render: (r) => `${r.bedrooms ?? '—'}bd / ${r.bathrooms ?? '—'}ba` },
              { key: 'square_feet', header: 'Sq Ft', render: (r) => r.square_feet?.toLocaleString() || '—' },
              { key: 'current_rent', header: 'Rent', align: 'right', render: (r) => <span className="font-mono">{formatCurrency(r.current_rent)}</span> },
              { key: 'market_rent', header: 'Market', align: 'right', render: (r) => <span className="font-mono">{formatCurrency(r.market_rent)}</span> },
              { key: 'tenant_name', header: 'Tenant', render: (r) => r.tenant_name || '—' },
              { key: 'actions', header: '', align: 'right', render: (r) => (
                <button onClick={() => openEditUnit(r)} className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors text-[var(--text-secondary)]"><Pencil className="w-3.5 h-3.5" /></button>
              )},
            ]}
            data={property.units || []}
            emptyText="No units — add one above"
          />
        </>
      )}

      {tab === 'projects' && (
        <Table
          columns={[
            { key: 'name', header: 'Project' },
            { key: 'status', header: 'Status', render: (r) => <Badge variant={r.status === 'active' ? 'success' : 'default'} size="sm">{r.status}</Badge> },
            { key: 'current_budget', header: 'Budget', align: 'right', render: (r) => <span className="font-mono">{formatCurrency(r.current_budget)}</span> },
            { key: 'actual_spend', header: 'Spent', align: 'right', render: (r) => <span className="font-mono">{formatCurrency(r.actual_spend)}</span> },
          ]}
          data={property.projects || []}
          onRowClick={(r) => navigate(`/projects/${r.id}`)}
          emptyText="No projects"
        />
      )}

      {tab === 'documents' && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Documents</h3>
            <Button size="sm" variant="secondary" iconLeft={<Plus className="w-3.5 h-3.5" />} onClick={() => setUploadModalOpen(true)}>
              Upload
            </Button>
          </div>
          {docsLoading ? (
            <Skeleton className="h-12 w-full" count={3} />
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <FileText className="w-8 h-8 text-[var(--text-disabled)]" />
              <p className="text-sm text-[var(--text-tertiary)]">No documents yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-elevated)]">
                  <FileText className="w-4 h-4 text-brand-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{doc.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      <span className="capitalize">{doc.document_type}</span>
                      {' · '}{doc.file_name}
                      {' · '}{formatDate(doc.created_at)}
                    </p>
                  </div>
                  <Badge size="sm" variant="default" className="capitalize flex-shrink-0">{doc.document_type}</Badge>
                  <button
                    onClick={async () => {
                      try {
                        const res = await api.get(`/v1/documents/${doc.id}/download`);
                        window.open(res.data.data.url, '_blank');
                      } catch {
                        toast.error('Could not generate download link');
                      }
                    }}
                    className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-tertiary)] hover:text-brand-400 transition-colors"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-1 rounded hover:bg-danger-bg text-[var(--text-tertiary)] hover:text-danger transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Modal open={unitModalOpen} onClose={() => setUnitModalOpen(false)} title={editUnit ? 'Edit Unit' : 'Add Unit'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Unit Number" placeholder="e.g. 1A" value={unitForm.unitNumber} onChange={(e) => setUnitForm((f) => ({ ...f, unitNumber: e.target.value }))} fullWidth />
            <Select
              label="Status"
              options={[
                { value: 'occupied', label: 'Occupied' },
                { value: 'vacant', label: 'Vacant' },
                { value: 'renovation', label: 'Renovation' },
                { value: 'offline', label: 'Offline' },
              ]}
              value={unitForm.status}
              onChange={(e) => setUnitForm((f) => ({ ...f, status: e.target.value }))}
              fullWidth
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--text-secondary)]">Bedrooms</label>
              <input type="number" min={0} value={unitForm.bedrooms} onChange={(e) => setUnitForm((f) => ({ ...f, bedrooms: parseInt(e.target.value) || 0 }))} className="w-full rounded-lg border bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-default)] focus:border-brand-500 focus:outline-none h-9 px-3 text-sm transition-colors" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--text-secondary)]">Bathrooms</label>
              <input type="number" min={0} step={0.5} value={unitForm.bathrooms} onChange={(e) => setUnitForm((f) => ({ ...f, bathrooms: parseFloat(e.target.value) || 0 }))} className="w-full rounded-lg border bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-default)] focus:border-brand-500 focus:outline-none h-9 px-3 text-sm transition-colors" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--text-secondary)]">Sq Ft</label>
              <input type="number" min={0} value={unitForm.squareFeet} onChange={(e) => setUnitForm((f) => ({ ...f, squareFeet: parseInt(e.target.value) || 0 }))} className="w-full rounded-lg border bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-default)] focus:border-brand-500 focus:outline-none h-9 px-3 text-sm transition-colors" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <CurrencyInput label="Current Rent / mo" value={unitForm.currentRent} onChange={(v) => setUnitForm((f) => ({ ...f, currentRent: v }))} />
            <CurrencyInput label="Market Rent / mo" value={unitForm.marketRent} onChange={(v) => setUnitForm((f) => ({ ...f, marketRent: v }))} />
          </div>
          <Input label="Tenant Name (optional)" value={unitForm.tenantName} onChange={(e) => setUnitForm((f) => ({ ...f, tenantName: e.target.value }))} fullWidth />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Lease Start" type="date" value={unitForm.leaseStart} onChange={(e) => setUnitForm((f) => ({ ...f, leaseStart: e.target.value }))} fullWidth />
            <Input label="Lease End" type="date" value={unitForm.leaseEnd} onChange={(e) => setUnitForm((f) => ({ ...f, leaseEnd: e.target.value }))} fullWidth />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setUnitModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveUnit} loading={unitSaving}>{editUnit ? 'Save Changes' : 'Add Unit'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={uploadModalOpen} onClose={() => setUploadModalOpen(false)} title="Upload Document" size="sm">
        <div className="p-4 space-y-3">
          <FileUpload
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.csv,.xlsx"
            onFile={setUploadFile}
            hint="PDF, Word, images, spreadsheets up to 50 MB"
          />
          <Input
            label="Document Name"
            placeholder="e.g. 2024 Appraisal"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            fullWidth
          />
          <Select
            label="Type"
            options={DOC_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            fullWidth
          />
          <div className="flex gap-3 pt-1">
            <Button fullWidth loading={uploading} onClick={handleUpload} disabled={!uploadFile}>
              Upload
            </Button>
            <Button variant="ghost" onClick={() => setUploadModalOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
