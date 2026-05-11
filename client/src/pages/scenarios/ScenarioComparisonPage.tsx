import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Download } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Skeleton from '@/components/ui/Skeleton';
import Button from '@/components/ui/Button';
import ScenarioComparisonBar from '@/components/scenarios/ScenarioComparisonBar';
import ScenarioComparisonGrid from '@/components/scenarios/ScenarioComparisonGrid';
import DecisionCaptureDialog from '@/components/scenarios/DecisionCaptureDialog';
import PromoteScenarioToProjectDialog from '@/components/scenarios/PromoteScenarioToProjectDialog';
import ComparisonPDFReport from '@/components/pdf/ComparisonPDFReport';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import type { Scenario, ScenarioComparison, Constraint } from '@/types/scenarios';

export default function ScenarioComparisonPage() {
  const { comparisonId } = useParams<{ comparisonId: string }>();
  const navigate = useNavigate();
  const { hasAccess } = useModuleAccess();
  const { userRole } = useAuthStore();

  const [comparison, setComparison] = useState<ScenarioComparison | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [loading, setLoading] = useState(true);

  const [decideFor, setDecideFor] = useState<string | null>(null);
  const [showPromote, setShowPromote] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get(`/v1/scenario-comparisons/${comparisonId}`);
      const comp: ScenarioComparison = data.data;
      setComparison(comp);
      setScenarios(comp.scenarios ?? []);

      // Fetch constraints for the attached property/deal
      const attachKey = comp.property_id ? 'propertyId' : 'dealId';
      const attachVal = comp.property_id ?? comp.deal_id;
      if (attachVal) {
        const cRes = await api.get('/v1/constraints', { params: { [attachKey]: attachVal } });
        setConstraints(cRes.data.data ?? []);
      }
    } catch {
      navigate('/scenarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [comparisonId]);

  const handleReopen = async () => {
    if (!comparison) return;
    try {
      await api.post(`/v1/scenario-comparisons/${comparison.id}/reopen`);
      load();
    } catch { /* non-fatal */ }
  };

  if (loading || !comparison) return (
    <PageWrapper>
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </PageWrapper>
  );

  const isDecided = !!comparison.selected_scenario_id;
  const selectedScenario = isDecided ? scenarios.find((s) => s.id === comparison.selected_scenario_id) : null;
  const baselineId = scenarios.find((s) => s.is_baseline)?.id;
  const canDecide = !isDecided && (userRole === 'admin' || userRole === 'project_manager');
  const isAdmin = userRole === 'admin';

  return (
    <PageWrapper>
      <PageHeader
        title={comparison.comparison_name}
        subtitle="Decision Support / Scenarios / Compare"
        actions={
          <div className="flex items-center gap-2">
            <PDFDownloadLink
              document={<ComparisonPDFReport comparison={comparison} scenarios={scenarios} constraints={constraints} />}
              fileName={`${comparison.comparison_name.replace(/\s+/g, '-').toLowerCase()}-comparison.pdf`}
              style={{ textDecoration: 'none' }}
            >
              <Button variant="ghost" size="sm" iconLeft={<Download className="w-3.5 h-3.5" />}>
                Export
              </Button>
            </PDFDownloadLink>
            {isDecided && isAdmin && (
              <Button variant="ghost" size="sm" onClick={handleReopen}>Reopen</Button>
            )}
            {isDecided && isAdmin && selectedScenario && comparison.property_id && (
              <Button size="sm" onClick={() => setShowPromote(true)}>
                Promote to Project
              </Button>
            )}
          </div>
        }
      />

      {isDecided && (
        <div className="rounded-xl bg-success-bg border border-success/20 px-4 py-3 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-success">Decision captured</p>
            {comparison.decision_notes && (
              <p className="text-xs text-success/80 mt-0.5">{comparison.decision_notes}</p>
            )}
          </div>
        </div>
      )}

      <ScenarioComparisonBar
        scenarios={scenarios}
        baselineId={baselineId}
      />

      <ScenarioComparisonGrid
        scenarios={scenarios}
        selectedId={comparison.selected_scenario_id}
        isDecided={isDecided}
        availableConstraints={constraints}
        canDecide={canDecide}
        onSelectPath={(scenarioId) => setDecideFor(scenarioId)}
      />

      {decideFor && (
        <DecisionCaptureDialog
          open
          onClose={() => setDecideFor(null)}
          onSuccess={() => { setDecideFor(null); load(); }}
          comparisonId={comparison.id}
          comparisonName={comparison.comparison_name}
          scenarioId={decideFor}
          scenarioName={scenarios.find((s) => s.id === decideFor)?.scenario_name ?? ''}
        />
      )}

      {showPromote && selectedScenario && (
        <PromoteScenarioToProjectDialog
          open
          onClose={() => setShowPromote(false)}
          comparison={comparison}
          scenario={selectedScenario}
          propertyId={comparison.property_id ?? undefined}
        />
      )}
    </PageWrapper>
  );
}
