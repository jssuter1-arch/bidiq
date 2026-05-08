import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit } from 'lucide-react';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Tabs from '@/components/ui/Tabs';
import Badge from '@/components/ui/Badge';
import Table from '@/components/ui/Table';
import Skeleton from '@/components/ui/Skeleton';
import YardiBadge from '@/components/ui/YardiBadge';
import { formatCurrency, formatDate } from '@/utils/format';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'units', label: 'Units' },
  { id: 'projects', label: 'Projects' },
  { id: 'documents', label: 'Documents' },
];

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    api.get(`/v1/properties/${id}/summary`)
      .then((r) => setProperty(r.data.data))
      .finally(() => setLoading(false));
  }, [id]);

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
        count: t.id === 'units' ? property.units?.length : t.id === 'projects' ? property.projects?.length : undefined,
      }))} active={tab} onChange={setTab} />

      {tab === 'overview' && (
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
      )}

      {tab === 'units' && (
        <Table
          columns={[
            { key: 'unit_number', header: 'Unit' },
            { key: 'status', header: 'Status', render: (r) => <Badge variant={r.status === 'occupied' ? 'success' : r.status === 'vacant' ? 'warning' : 'info'} size="sm" dot>{r.status}</Badge> },
            { key: 'bedrooms', header: 'Bed', render: (r) => `${r.bedrooms}bd/${r.bathrooms}ba` },
            { key: 'square_feet', header: 'Sq Ft', render: (r) => r.square_feet?.toLocaleString() || '—' },
            { key: 'current_rent', header: 'Rent', align: 'right', render: (r) => <span className="font-mono">{formatCurrency(r.current_rent)}</span> },
            { key: 'market_rent', header: 'Market', align: 'right', render: (r) => <span className="font-mono">{formatCurrency(r.market_rent)}</span> },
            { key: 'tenant_name', header: 'Tenant', render: (r) => r.tenant_name || '—' },
          ]}
          data={property.units || []}
          emptyText="No units"
        />
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
        <Card>
          <p className="text-sm text-[var(--text-tertiary)] text-center py-8">Document upload coming soon</p>
        </Card>
      )}
    </PageWrapper>
  );
}
