import { useEffect, useState } from 'react';
import { RefreshCw, Upload, AlertCircle } from 'lucide-react';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Table from '@/components/ui/Table';
import FileUpload from '@/components/ui/FileUpload';
import Select from '@/components/ui/Select';
import { formatRelative } from '@/utils/format';
import toast from 'react-hot-toast';

export default function YardiPage() {
  const [syncLog, setSyncLog] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dataType, setDataType] = useState('properties');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    Promise.all([
      api.get('/v1/yardi/sync-log'),
      api.get('/v1/yardi/conflicts'),
    ]).then(([sl, c]) => {
      setSyncLog(sl.data.data || []);
      setConflicts(c.data.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const { data: initData } = await api.post('/v1/yardi/upload-init', {
        fileName: selectedFile.name,
        dataType,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type || 'text/csv',
      });

      const { syncLogId, storagePath, signedUrl } = initData.data;

      const uploadRes = await fetch(signedUrl, { method: 'PUT', body: selectedFile, headers: { 'Content-Type': 'text/csv' } });
      if (!uploadRes.ok) throw new Error('Upload failed');

      await api.post('/v1/yardi/process', {
        syncLogId,
        storagePath,
        columnMappings: {},
        conflictResolution: 'ask',
      });

      toast.success('Import complete');
      const { data: newLog } = await api.get('/v1/yardi/sync-log');
      setSyncLog(newLog.data || []);
    } catch (err: any) {
      toast.error(err.message || 'Import failed');
    } finally {
      setUploading(false);
      setSelectedFile(null);
    }
  };

  const handleResolveConflict = async (conflictId: string, resolution: 'kept_bidiq' | 'used_yardi') => {
    await api.post('/v1/yardi/conflicts/resolve', { conflictIds: [conflictId], resolution });
    setConflicts((prev) => prev.filter((c) => c.id !== conflictId));
    toast.success('Conflict resolved');
  };

  return (
    <PageWrapper>
      <PageHeader title="Yardi Integration" subtitle="One-way CSV import from Yardi" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2"><Upload className="w-4 h-4 text-brand-400" /> Import CSV</h3>
          <Select label="Data Type" options={[
            { value: 'properties', label: 'Properties' },
            { value: 'units', label: 'Units' },
            { value: 'vendors', label: 'Vendors / Contractors' },
            { value: 'invoices', label: 'Invoices / POs' },
            { value: 'transactions', label: 'Transactions' },
            { value: 'tenants', label: 'Tenants' },
          ]} value={dataType} onChange={(e) => setDataType(e.target.value)} fullWidth />
          <FileUpload
            accept=".csv"
            onFile={(f) => setSelectedFile(f)}
            label="CSV File"
            hint="Up to 50MB. Column names are fuzzy-matched to Yardi export defaults."
          />
          <Button fullWidth loading={uploading} disabled={!selectedFile} onClick={handleUpload} iconLeft={<RefreshCw className="w-4 h-4" />}>
            Import
          </Button>
        </Card>

        {conflicts.length > 0 && (
          <Card className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-warning" /> Conflicts ({conflicts.length})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {conflicts.slice(0, 10).map((c) => (
                <div key={c.id} className="p-3 rounded-lg bg-[var(--bg-elevated)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[var(--text-primary)]">{c.table_name}.{c.field_name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-[var(--bg-overlay)]">
                      <p className="text-[var(--text-tertiary)]">BidIQ</p>
                      <p className="text-[var(--text-primary)] truncate">{c.bidiq_value || '—'}</p>
                    </div>
                    <div className="p-2 rounded bg-[var(--bg-overlay)]">
                      <p className="text-[var(--text-tertiary)]">Yardi</p>
                      <p className="text-[var(--text-primary)] truncate">{c.yardi_value || '—'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="xs" variant="secondary" onClick={() => handleResolveConflict(c.id, 'kept_bidiq')}>Keep BidIQ</Button>
                    <Button size="xs" variant="secondary" onClick={() => handleResolveConflict(c.id, 'used_yardi')}>Use Yardi</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <Card className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Sync History</h3>
        <Table
          columns={[
            { key: 'data_type', header: 'Type', render: (r: any) => <span className="capitalize">{r.data_type?.replace('_', ' ')}</span> },
            { key: 'file_name', header: 'File', render: (r: any) => r.file_name || '—' },
            { key: 'status', header: 'Status', render: (r: any) => <Badge size="sm" variant={r.status === 'completed' ? 'success' : r.status === 'failed' ? 'danger' : 'info'}>{r.status}</Badge> },
            { key: 'records_processed', header: 'Processed', align: 'right' },
            { key: 'records_created', header: 'Created', align: 'right' },
            { key: 'records_updated', header: 'Updated', align: 'right' },
            { key: 'records_conflicted', header: 'Conflicts', align: 'right', render: (r: any) => r.records_conflicted > 0 ? <span className="text-warning font-medium">{r.records_conflicted}</span> : '0' },
            { key: 'started_at', header: 'When', render: (r: any) => formatRelative(r.started_at) },
          ]}
          data={syncLog}
          loading={loading}
          emptyText="No imports yet"
        />
      </Card>
    </PageWrapper>
  );
}
