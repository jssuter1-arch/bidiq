import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Edit, Plus, GitCompare, ArrowRight, ChevronDown,
  MapPin, Phone, Mail, User, Building2
} from 'lucide-react';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Tabs from '@/components/ui/Tabs';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { AcquisitionDeal, UnderwritingModel, SensitivityResult, DEAL_STATUS_LABELS, PIPELINE_STATUSES, DealStatus } from '@/types/deals';
import { formatCurrency, formatDate } from '@/utils/format';
import DealStatusBadge from '@/components/deals/DealStatusBadge';
import UnderwritingResultsPanel from '@/components/deals/UnderwritingResultsPanel';
import SensitivityTable from '@/components/deals/SensitivityTable';
import UnderwritingVersionList from '@/components/deals/UnderwritingVersionList';
import MarkLostDialog from '@/components/deals/MarkLostDialog';
import PromoteToPropertyDialog from '@/components/deals/PromoteToPropertyDialog';
import ConstraintMiniTable from '@/components/scenarios/ConstraintMiniTable';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import type { Constraint } from '@/types/scenarios';

const VALID_TRANSITIONS: Record<DealStatus, DealStatus[]> = {
  prospecting: ['underwriting', 'passed'],
  underwriting: ['prospecting', 'loi_submitted', 'passed'],
  loi_submitted: ['under_negotiation', 'passed'],
  under_negotiation: ['due_diligence', 'closed_lost', 'passed'],
  due_diligence: ['closed_won', 'closed_lost'],
  closed_won: [],
  closed_lost: [],
  passed: ['prospecting'],
};

const TAB_IDS = ['overview', 'underwriting', 'documents', 'regulatory', 'activity'];

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userRole } = useAuthStore();

  const [deal, setDeal] = useState<AcquisitionDeal | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(
    TAB_IDS.includes(searchParams.get('tab') || '') ? searchParams.get('tab')! : 'overview'
  );
  const [sensitivity, setSensitivity] = useState<SensitivityResult | null>(null);
  const [sensitivityLoading, setSensitivityLoading] = useState(false);
  const [markLostOpen, setMarkLostOpen] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [dealConstraints, setDealConstraints] = useState<Constraint[]>([]);
  const [dealConstraintsLoading, setDealConstraintsLoading] = useState(false);

  const canWrite = userRole === 'admin' || userRole === 'project_manager';
  const isAdmin = userRole === 'admin';

  function fetchDeal() {
    api.get(`/v1/deals/${id}`)
      .then((r) => setDeal(r.data.data))
      .catch(() => navigate('/deals'))
      .finally(() => setLoading(false));
  }

  const loadDealConstraints = useCallback(() => {
    setDealConstraintsLoading(true);
    api.get('/v1/constraints', { params: { dealId: id } })
      .then((r) => setDealConstraints(r.data.data ?? []))
      .catch(() => {})
      .finally(() => setDealConstraintsLoading(false));
  }, [id]);

  useEffect(() => { fetchDeal(); }, [id]);

  useEffect(() => {
    if (activeTab === 'regulatory') loadDealConstraints();
  }, [activeTab, loadDealConstraints]);

  useEffect(() => {
    setSearchParams({ tab: activeTab }, { replace: true });
  }, [activeTab]);

  const activeModel: UnderwritingModel | null = (() => {
    if (!deal?.deal_underwriting_models) return null;
    return deal.deal_underwriting_models.find((m) => m.is_active_version) || null;
  })();

  async function fetchSensitivity() {
    if (!activeModel || sensitivity) return;
    setSensitivityLoading(true);
    try {
      const { data } = await api.post(`/v1/underwriting/${activeModel.id}/sensitivity`);
      setSensitivity(data.data);
    } finally {
      setSensitivityLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'underwriting' && activeModel && !sensitivity) {
      fetchSensitivity();
    }
  }, [activeTab, activeModel]);

  async function handleStatusTransition(to: DealStatus) {
    if (!deal) return;
    if (to === 'closed_lost') {
      setMarkLostOpen(true);
      setStatusMenuOpen(false);
      return;
    }
    setTransitioning(true);
    setStatusMenuOpen(false);
    try {
      await api.patch(`/v1/deals/${id}/status`, { to });
      fetchDeal();
    } finally {
      setTransitioning(false);
    }
  }

  if (loading) return (
    <PageWrapper>
      <PageHeader title="Deal" />
      <div className="space-y-3">
        <Skeleton className="h-12" />
        <Skeleton className="h-96" />
      </div>
    </PageWrapper>
  );

  if (!deal) return null;

  const allowedTransitions = VALID_TRANSITIONS[deal.status] || [];
  const isTerminal = deal.status === 'closed_won' || deal.status === 'closed_lost';
  const isPromoted = !!deal.promoted_to_property_id;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'underwriting', label: 'Underwriting', count: deal.deal_underwriting_models?.length },
    { id: 'documents', label: 'Documents' },
    { id: 'regulatory', label: 'Regulatory' },
    { id: 'activity', label: 'Activity' },
  ];

  return (
    <PageWrapper>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-heading font-bold text-[var(--text-primary)]">{deal.deal_name}</h1>
            <DealStatusBadge status={deal.status} dot />
          </div>
          {(deal.city || deal.state) && (
            <p className="text-sm text-[var(--text-tertiary)] flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {[deal.street_address, deal.city, deal.state, deal.zip].filter(Boolean).join(', ')}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canWrite && !isTerminal && (
            <div className="relative">
              <Button
                variant="secondary"
                size="sm"
                iconRight={<ChevronDown className="w-3.5 h-3.5" />}
                loading={transitioning}
                onClick={() => setStatusMenuOpen((o) => !o)}
              >
                Move to…
              </Button>
              {statusMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setStatusMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 min-w-[180px] rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-overlay p-1">
                    {allowedTransitions.map((to) => (
                      <button
                        key={to}
                        onClick={() => handleStatusTransition(to)}
                        className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors text-[var(--text-primary)]"
                      >
                        {DEAL_STATUS_LABELS[to]}
                      </button>
                    ))}
                    {allowedTransitions.length === 0 && (
                      <p className="text-xs text-[var(--text-tertiary)] px-3 py-2">No transitions available</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          {canWrite && (
            <Button variant="secondary" size="sm" iconLeft={<Edit className="w-3.5 h-3.5" />} onClick={() => navigate(`/deals/${id}/edit`)}>
              Edit
            </Button>
          )}
          {deal.status === 'closed_won' && isAdmin && !isPromoted && (
            <Button size="sm" variant="success" iconLeft={<ArrowRight className="w-3.5 h-3.5" />} onClick={() => setPromoteOpen(true)}>
              Promote to Property
            </Button>
          )}
          {isPromoted && (
            <Button size="sm" variant="ghost" onClick={() => navigate(`/properties/${deal.promoted_to_property_id}`)}>
              View Property →
            </Button>
          )}
        </div>
      </div>

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Key figures */}
            <Card className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Asking Price', value: formatCurrency(deal.asking_price, true) || '—' },
                { label: 'Units', value: deal.total_units ? String(deal.total_units) : '—' },
                { label: 'Sq Ft', value: deal.total_sqft ? `${deal.total_sqft.toLocaleString()}` : '—' },
                { label: 'Property Type', value: deal.property_type?.replace('_', ' ') || '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-2xs text-[var(--text-tertiary)] uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">{value}</p>
                </div>
              ))}
            </Card>

            {/* Active UW summary */}
            {activeModel && (
              <Card className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Active Underwriting</h3>
                  <Badge variant="brand" size="sm">{activeModel.model_name || `v${activeModel.version}`}</Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'IRR', value: activeModel.irr != null ? `${(activeModel.irr * 100).toFixed(1)}%` : '—', ok: activeModel.meets_hurdle },
                    { label: 'Equity ×', value: activeModel.equity_multiple != null ? `${activeModel.equity_multiple.toFixed(2)}x` : '—', ok: null },
                    { label: 'NPV', value: formatCurrency(activeModel.npv, true), ok: (activeModel.npv ?? 0) > 0 },
                    { label: 'Max Bid', value: activeModel.recommended_max_bid ? formatCurrency(activeModel.recommended_max_bid, true) : '—', ok: null },
                  ].map(({ label, value, ok }) => (
                    <div key={label}>
                      <p className="text-2xs text-[var(--text-tertiary)] uppercase tracking-wide">{label}</p>
                      <p className={`text-sm font-mono font-semibold mt-0.5 ${ok === true ? 'text-success' : ok === false ? 'text-danger' : 'text-[var(--text-primary)]'}`}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {deal.notes && (
              <Card>
                <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">Notes</h3>
                <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{deal.notes}</p>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Contact */}
            {(deal.source_contact_name || deal.source_contact_email || deal.source_contact_phone) && (
              <Card className="space-y-3">
                <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Source Contact</h3>
                <div className="space-y-2">
                  {deal.source_contact_name && (
                    <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                      <User className="w-3.5 h-3.5 text-[var(--text-tertiary)] flex-shrink-0" />
                      {deal.source_contact_name}
                    </div>
                  )}
                  {deal.source_contact_email && (
                    <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                      <Mail className="w-3.5 h-3.5 text-[var(--text-tertiary)] flex-shrink-0" />
                      <a href={`mailto:${deal.source_contact_email}`} className="text-brand-400 hover:underline">
                        {deal.source_contact_email}
                      </a>
                    </div>
                  )}
                  {deal.source_contact_phone && (
                    <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                      <Phone className="w-3.5 h-3.5 text-[var(--text-tertiary)] flex-shrink-0" />
                      {deal.source_contact_phone}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Deal metadata */}
            <Card className="space-y-2 text-xs">
              {[
                { label: 'Source', value: deal.source?.replace('_', ' ') },
                { label: 'Expected Close', value: formatDate(deal.expected_close_date) },
                { label: 'Status Since', value: formatDate(deal.status_changed_at) },
                { label: 'Created', value: formatDate(deal.created_at) },
                deal.closed_lost_reason ? { label: 'Lost Reason', value: deal.closed_lost_reason } : null,
              ].filter(Boolean).map(({ label, value }: any) => (
                <div key={label} className="flex justify-between">
                  <span className="text-[var(--text-tertiary)]">{label}</span>
                  <span className="text-[var(--text-primary)] text-right max-w-[60%] break-words">{value || '—'}</span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* ── Underwriting Tab ── */}
      {activeTab === 'underwriting' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Underwriting Models</h3>
            <div className="flex gap-2">
              {(deal.deal_underwriting_models?.length ?? 0) >= 2 && (
                <Button
                  variant="secondary"
                  size="sm"
                  iconLeft={<GitCompare className="w-3.5 h-3.5" />}
                  onClick={() => navigate(`/deals/${id}/underwriting/compare`)}
                >
                  Compare
                </Button>
              )}
              {canWrite && (
                <Button
                  size="sm"
                  iconLeft={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => navigate(`/deals/${id}/underwriting/new`)}
                >
                  New Model
                </Button>
              )}
            </div>
          </div>

          <UnderwritingVersionList
            models={deal.deal_underwriting_models || []}
            dealId={id!}
            onRefresh={fetchDeal}
            userRole={userRole}
          />

          {activeModel && (
            <>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Active Model Results</h3>
              <UnderwritingResultsPanel model={activeModel} />
            </>
          )}

          {activeModel && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Sensitivity Analysis</h3>
              {sensitivityLoading ? (
                <Skeleton className="h-64" />
              ) : sensitivity ? (
                <Card>
                  <SensitivityTable data={sensitivity} hurdleRate={activeModel.hurdle_rate} />
                </Card>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* ── Documents Tab ── */}
      {activeTab === 'documents' && (
        <Card className="text-center py-10">
          <Building2 className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2" />
          <p className="text-sm text-[var(--text-secondary)]">Documents associated with this deal appear here after upload.</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">Use the Documents module to attach files to this deal.</p>
        </Card>
      )}

      {/* ── Regulatory Tab ── */}
      {activeTab === 'regulatory' && (
        <Card className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Regulatory Constraints</h3>
          {dealConstraintsLoading ? (
            <Skeleton className="h-24 rounded-lg" />
          ) : (
            <ConstraintMiniTable
              constraints={dealConstraints}
              dealId={id}
              canWrite={canWrite}
              onRefresh={loadDealConstraints}
            />
          )}
        </Card>
      )}

      {/* ── Activity Tab ── */}
      {activeTab === 'activity' && (
        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Timeline</h3>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-[var(--text-primary)]">Deal created</p>
                <p className="text-xs text-[var(--text-tertiary)]">{formatDate(deal.created_at)}</p>
              </div>
            </div>
            {deal.status_changed_at && deal.status !== 'prospecting' && (
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Status changed to {DEAL_STATUS_LABELS[deal.status]}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{formatDate(deal.status_changed_at)}</p>
                </div>
              </div>
            )}
            {deal.promoted_at && (
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-success mt-1.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-[var(--text-primary)]">Promoted to property</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{formatDate(deal.promoted_at)}</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Dialogs */}
      <MarkLostDialog
        dealId={id!}
        open={markLostOpen}
        onClose={() => setMarkLostOpen(false)}
        onSuccess={fetchDeal}
      />
      {deal && (
        <PromoteToPropertyDialog
          deal={deal}
          open={promoteOpen}
          onClose={() => setPromoteOpen(false)}
        />
      )}
    </PageWrapper>
  );
}
