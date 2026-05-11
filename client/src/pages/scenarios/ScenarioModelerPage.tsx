import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Download } from 'lucide-react';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Skeleton from '@/components/ui/Skeleton';
import Button from '@/components/ui/Button';
import ScenarioModelerForm from '@/components/scenarios/ScenarioModelerForm';
import ScenarioRelatedSidebar from '@/components/scenarios/ScenarioRelatedSidebar';
import ApplyScenarioToUnderwritingDialog from '@/components/scenarios/ApplyScenarioToUnderwritingDialog';
import ScenarioPDFReport from '@/components/pdf/ScenarioPDFReport';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import TemplateScopePicker from '@/components/scenarios/TemplateScopePicker';
import api from '@/services/api';
import type { Scenario, Constraint } from '@/types/scenarios';

export default function ScenarioModelerPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hasAccess } = useModuleAccess();

  const isNew = !id || id === 'new';
  const propertyId = searchParams.get('propertyId') ?? undefined;
  const dealId = searchParams.get('dealId') ?? undefined;

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [showApplyUW, setShowApplyUW] = useState(false);

  useEffect(() => {
    if (isNew) return;
    const load = async () => {
      try {
        const { data } = await api.get(`/v1/scenarios/${id}`);
        const s: Scenario = data.data;
        setScenario(s);

        // Fetch constraints for the attached property/deal
        const attachKey = s.property_id ? 'propertyId' : 'dealId';
        const attachVal = s.property_id ?? s.deal_id;
        if (attachVal) {
          const { data: cData } = await api.get('/v1/constraints', { params: { [attachKey]: attachVal, isActive: 'true' } });
          setConstraints(cData.data ?? []);
        }
      } catch {
        navigate('/scenarios');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isNew, navigate]);

  // For new scenarios, fetch constraints from query params
  useEffect(() => {
    if (!isNew) return;
    const attachKey = propertyId ? 'propertyId' : dealId ? 'dealId' : null;
    const attachVal = propertyId ?? dealId;
    if (!attachKey || !attachVal) return;
    api.get('/v1/constraints', { params: { [attachKey]: attachVal, isActive: 'true' } })
      .then((r) => setConstraints(r.data.data ?? []))
      .catch(() => {});
  }, [isNew, propertyId, dealId]);

  if (loading) return (
    <PageWrapper>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-96 rounded-xl" />
    </PageWrapper>
  );

  const canWrite = hasAccess('scenario_modeling');
  const isDealAttached = scenario?.deal_id || dealId;

  return (
    <PageWrapper>
      <PageHeader
        title={isNew ? 'New Scenario' : scenario?.scenario_name ?? 'Scenario'}
        subtitle={isNew ? 'Decision Support / Scenarios / New' : 'Decision Support / Scenarios / Edit'}
        actions={
          !isNew && scenario ? (
            <div className="flex items-center gap-2">
              <PDFDownloadLink
                document={<ScenarioPDFReport scenario={scenario} constraints={constraints} />}
                fileName={`${scenario.scenario_name.replace(/\s+/g, '-').toLowerCase()}-scenario.pdf`}
                style={{ textDecoration: 'none' }}
              >
                <Button variant="ghost" size="sm" iconLeft={<Download className="w-3.5 h-3.5" />}>
                  Export
                </Button>
              </PDFDownloadLink>
              {isDealAttached && (
                <Button variant="secondary" size="sm" onClick={() => setShowApplyUW(true)}>
                  Apply to Underwriting
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          {hasAccess('cost_intelligence_extended') && isNew && propertyId && (
            <TemplateScopePicker
              propertyId={propertyId}
              onApply={(_lineItems, total, _warnings) => {
                // Surface the total as a suggested renovation cost via the form
                // The form will still let the user adjust it manually
                console.debug('[TemplateScopePicker] draft total:', total);
              }}
            />
          )}
          <ScenarioModelerForm
            existing={isNew ? undefined : scenario ?? undefined}
            propertyId={propertyId}
            dealId={dealId}
            availableConstraints={constraints}
          />
        </div>

        {!isNew && scenario && (
          <ScenarioRelatedSidebar scenario={scenario} canWrite={canWrite} />
        )}
      </div>

      {!isNew && scenario && showApplyUW && (
        <ApplyScenarioToUnderwritingDialog
          open={showApplyUW}
          onClose={() => setShowApplyUW(false)}
          onSuccess={() => setShowApplyUW(false)}
          scenario={scenario}
        />
      )}
    </PageWrapper>
  );
}
