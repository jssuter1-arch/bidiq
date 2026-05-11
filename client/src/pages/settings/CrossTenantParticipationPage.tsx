import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldOff } from 'lucide-react';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import toast from 'react-hot-toast';
import { formatDate } from '@/utils/format';

export default function CrossTenantParticipationPage() {
  const [participation, setParticipation] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingState, setPendingState] = useState<boolean | null>(null);

  useEffect(() => {
    api.get('/v1/cross-tenant-participation')
      .then((r) => {
        setParticipation(r.data.data?.participation);
        setHistory(r.data.data?.history || []);
        setPendingState(r.data.data?.participation?.is_participating ?? true);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (pendingState === null) return;
    setSaving(true);
    try {
      const { data } = await api.patch('/v1/cross-tenant-participation', { isParticipating: pendingState });
      setParticipation(data.data);
      toast.success(`Participation ${pendingState ? 'enabled' : 'disabled'}`);
    } catch { toast.error('Failed to update participation'); }
    finally { setSaving(false); }
  };

  const isParticipating = pendingState ?? participation?.is_participating ?? true;

  return (
    <PageWrapper>
      <PageHeader
        title="Cross-Tenant Participation"
        subtitle="Control your organization's contribution to anonymized industry benchmarks"
      />

      {/* Primary Toggle */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isParticipating
              ? <ShieldCheck className="w-6 h-6 text-success" />
              : <ShieldOff className="w-6 h-6 text-[var(--text-tertiary)]" />
            }
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Contribute anonymized data to industry benchmarks
              </p>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                {isParticipating ? 'Currently opted in' : 'Currently opted out'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setPendingState(!isParticipating)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isParticipating ? 'bg-brand-500' : 'bg-[var(--border-default)]'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isParticipating ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {isParticipating ? (
          <div className="p-4 rounded-lg bg-[#14532d10] border border-success/20">
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Your organization is contributing anonymized cost data, project performance data, and change-order data
              to the industry benchmark pool. In return, you receive cross-tenant percentile rankings on your cost intelligence pages.
              No identifiable information about your organization or any individual project is shared.
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
            <p className="text-sm text-[var(--text-tertiary)] leading-relaxed">
              Your organization is not contributing data. You can still see industry benchmarks where sufficient data exists
              from other contributors. You can re-enable participation at any time.
            </p>
          </div>
        )}
      </Card>

      {/* What Gets Shared */}
      <Card className="space-y-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">What Gets Shared (When Participating)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Included</p>
            <ul className="space-y-1 text-xs text-[var(--text-secondary)]">
              {[
                'Aggregated cost-per-unit and cost-per-sqft by work category',
                'Change-order rates by category',
                'Project completion time vs. budget metrics',
                'Property type, metro-area bucket, and unit count ranges',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-success mt-0.5">✓</span> {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Never Shared</p>
            <ul className="space-y-1 text-xs text-[var(--text-secondary)]">
              {[
                'Property addresses, names, or any identifying details',
                'Specific deal terms or purchase prices',
                'Contractor names or identities',
                'Individual line item details',
                'User names or contact information',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-danger mt-0.5">✗</span> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* Aggregation Mechanism */}
      <Card className="space-y-2">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Aggregation Mechanism</h3>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Data is k-anonymized: a benchmark for any category only publishes once at least 5 distinct contributing organizations
          have data for that category. Below this threshold, the aggregate is suppressed and no data is visible to any user.
          The aggregation job runs nightly. If you opt out, your contribution is fully removed from the next nightly computation.
        </p>
      </Card>

      {/* Audit History */}
      {history.length > 0 && (
        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Participation History</h3>
          <Table
            data={history}
            columns={[
              { key: 'created_at', header: 'Date', render: (r: any) => formatDate(r.created_at) },
              { key: 'new_values', header: 'New State', render: (r: any) => {
                const val = r.new_values?.is_participating;
                return <Badge variant={val ? 'success' : 'default'}>{val ? 'Opted In' : 'Opted Out'}</Badge>;
              }},
              { key: 'performed_by', header: 'Changed By', render: (r: any) => r.performed_by || '—' },
            ]}
            emptyText="No history"
          />
        </Card>
      )}

      {/* Save/Cancel */}
      {pendingState !== (participation?.is_participating ?? true) && (
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} loading={saving}>Save Changes</Button>
          <Button variant="secondary" onClick={() => setPendingState(participation?.is_participating ?? true)}>Cancel</Button>
        </div>
      )}
    </PageWrapper>
  );
}
