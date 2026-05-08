import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/utils/format';
import { differenceInDays } from 'date-fns';

function ExpiryCell({ date }: { date: string | null }) {
  if (!date) return <span className="text-[var(--text-tertiary)]">—</span>;
  const days = differenceInDays(new Date(date), new Date());
  if (days < 0) return <span className="text-danger font-medium">Expired</span>;
  if (days <= 30) return <span className="text-warning font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{formatDate(date)} ({days}d)</span>;
  return <span>{formatDate(date)}</span>;
}

export default function PermitsPage() {
  const [permits, setPermits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/v1/permits', { params: { limit: 100 } })
      .then((r) => setPermits(r.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  const expiring = permits.filter((p) => p.expiry_date && differenceInDays(new Date(p.expiry_date), new Date()) <= 30 && p.status !== 'closed');

  return (
    <PageWrapper>
      <PageHeader title="Permits" subtitle={`${permits.length} permits${expiring.length > 0 ? ` · ${expiring.length} expiring soon` : ''}`} />
      {expiring.length > 0 && (
        <div className="rounded-xl border border-warning/20 bg-warning-bg p-4 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
          <p className="text-sm text-warning">{expiring.length} permit{expiring.length > 1 ? 's' : ''} expiring within 30 days. Schedule inspections now.</p>
        </div>
      )}
      <Table
        columns={[
          { key: 'permit_type', header: 'Type', render: (r: any) => <span className="capitalize">{r.permit_type?.replace('_', ' ')}</span> },
          { key: 'projects', header: 'Project', render: (r: any) => r.projects?.name || '—' },
          { key: 'permit_number', header: 'Permit #', render: (r: any) => r.permit_number || 'Pending' },
          { key: 'issuing_authority', header: 'Authority', render: (r: any) => r.issuing_authority || '—' },
          { key: 'status', header: 'Status', render: (r: any) => <Badge size="sm" variant={r.status === 'active' ? 'success' : r.status === 'expired' ? 'danger' : r.status === 'approved' ? 'info' : 'default'}>{r.status?.replace('_', ' ')}</Badge> },
          { key: 'issue_date', header: 'Issued', render: (r: any) => formatDate(r.issue_date) },
          { key: 'expiry_date', header: 'Expires', render: (r: any) => <ExpiryCell date={r.expiry_date} /> },
          { key: 'fee_amount', header: 'Fee', align: 'right', render: (r: any) => <span className="font-mono">{formatCurrency(r.fee_amount)}</span> },
        ]}
        data={permits}
        loading={loading}
        emptyText="No permits"
      />
    </PageWrapper>
  );
}
