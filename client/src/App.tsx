import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import AppShell from './components/layout/AppShell';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import Spinner from './components/ui/Spinner';

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const MagicLinkPage = lazy(() => import('./pages/auth/MagicLinkPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const AuthCallbackPage = lazy(() => import('./pages/auth/AuthCallbackPage'));
const InviteAcceptPage = lazy(() => import('./pages/auth/InviteAcceptPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const PropertiesPage = lazy(() => import('./pages/properties/PropertiesPage'));
const PropertyDetailPage = lazy(() => import('./pages/properties/PropertyDetailPage'));
const NewPropertyPage = lazy(() => import('./pages/properties/NewPropertyPage'));
const EditPropertyPage = lazy(() => import('./pages/properties/EditPropertyPage'));
const ProjectsPage = lazy(() => import('./pages/projects/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('./pages/projects/ProjectDetailPage'));
const NewProjectPage = lazy(() => import('./pages/projects/NewProjectPage'));
const EditProjectPage = lazy(() => import('./pages/projects/EditProjectPage'));
const ContractorsPage = lazy(() => import('./pages/contractors/ContractorsPage'));
const ContractorDetailPage = lazy(() => import('./pages/contractors/ContractorDetailPage'));
const NewContractorPage = lazy(() => import('./pages/contractors/NewContractorPage'));
const EditContractorPage = lazy(() => import('./pages/contractors/EditContractorPage'));
const BudgetPage = lazy(() => import('./pages/BudgetPage'));
const YardiPage = lazy(() => import('./pages/YardiPage'));
const BenchmarksPage = lazy(() => import('./pages/BenchmarksPage'));
const EquityPage = lazy(() => import('./pages/EquityPage'));
const CashPage = lazy(() => import('./pages/CashPage'));
const PermitsPage = lazy(() => import('./pages/PermitsPage'));
const LoanDrawsPage = lazy(() => import('./pages/LoanDrawsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AuditPage = lazy(() => import('./pages/AuditPage'));
const DemoPage = lazy(() => import('./pages/DemoPage'));
const DealsPage = lazy(() => import('./pages/deals/DealsPage'));
const NewDealPage = lazy(() => import('./pages/deals/NewDealPage'));
const EditDealPage = lazy(() => import('./pages/deals/EditDealPage'));
const DealDetailPage = lazy(() => import('./pages/deals/DealDetailPage'));
const UnderwritingFormPage = lazy(() => import('./pages/deals/UnderwritingFormPage'));
const UnderwritingComparePage = lazy(() => import('./pages/deals/UnderwritingComparePage'));
const LenderDossierPage = lazy(() => import('./pages/LenderDossierPage'));
const ScenarioLibraryPage = lazy(() => import('./pages/scenarios/ScenarioLibraryPage'));
const ScenarioModelerPage = lazy(() => import('./pages/scenarios/ScenarioModelerPage'));
const ScenarioComparisonPage = lazy(() => import('./pages/scenarios/ScenarioComparisonPage'));
const ConstraintLibraryPage = lazy(() => import('./pages/scenarios/ConstraintLibraryPage'));
const PortfolioDashboardPage = lazy(() => import('./pages/portfolio/PortfolioDashboardPage'));
const CapitalTimelinePage = lazy(() => import('./pages/portfolio/CapitalTimelinePage'));
const CostSavingsDetailPage = lazy(() => import('./pages/portfolio/CostSavingsDetailPage'));
const PortfolioBenchmarksPage = lazy(() => import('./pages/portfolio/PortfolioBenchmarksPage'));
const DecisionHubPage = lazy(() => import('./pages/DecisionHubPage'));
const CrossTenantParticipationPage = lazy(() => import('./pages/settings/CrossTenantParticipationPage'));
const PricingTemplateLibraryPage = lazy(() => import('./pages/intelligence/PricingTemplateLibraryPage'));
const PricingTemplateDetailPage = lazy(() => import('./pages/intelligence/PricingTemplateDetailPage'));
const ChangeOrderAnalyticsPage = lazy(() => import('./pages/intelligence/ChangeOrderAnalyticsPage'));
const ChangeOrderBackfillQueuePage = lazy(() => import('./pages/intelligence/ChangeOrderBackfillQueuePage'));
const ScopeFactorsAdminPage = lazy(() => import('./pages/intelligence/ScopeFactorsAdminPage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session } = useAuthStore();
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { theme } = useThemeStore();

  return (
    <div data-theme={theme}>
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/magic-link" element={<MagicLinkPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/invite" element={<InviteAcceptPage />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="properties" element={<PropertiesPage />} />
            <Route path="properties/new" element={<NewPropertyPage />} />
            <Route path="properties/:id" element={<PropertyDetailPage />} />
            <Route path="properties/:id/edit" element={<EditPropertyPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/new" element={<NewProjectPage />} />
            <Route path="projects/:id" element={<ProjectDetailPage />} />
            <Route path="projects/:id/edit" element={<EditProjectPage />} />
            <Route path="contractors" element={<ContractorsPage />} />
            <Route path="contractors/new" element={<NewContractorPage />} />
            <Route path="contractors/:id" element={<ContractorDetailPage />} />
            <Route path="contractors/:id/edit" element={<EditContractorPage />} />
            <Route path="budget" element={<BudgetPage />} />
            <Route path="yardi" element={<YardiPage />} />
            <Route path="benchmarks" element={<BenchmarksPage />} />
            <Route path="equity" element={<EquityPage />} />
            <Route path="cash" element={<CashPage />} />
            <Route path="permits" element={<PermitsPage />} />
            <Route path="loan-draws" element={<LoanDrawsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="deals" element={<DealsPage />} />
            <Route path="deals/new" element={<NewDealPage />} />
            <Route path="deals/:id" element={<DealDetailPage />} />
            <Route path="deals/:id/edit" element={<EditDealPage />} />
            <Route path="deals/:dealId/underwriting/new" element={<UnderwritingFormPage />} />
            <Route path="deals/:dealId/underwriting/compare" element={<UnderwritingComparePage />} />
            <Route path="underwriting/:id/edit" element={<UnderwritingFormPage />} />
            <Route path="lender-dossier" element={<LenderDossierPage />} />
            <Route path="scenarios" element={<ScenarioLibraryPage />} />
            <Route path="scenarios/new" element={<ScenarioModelerPage />} />
            <Route path="scenarios/compare/:comparisonId" element={<ScenarioComparisonPage />} />
            <Route path="scenarios/:id" element={<ScenarioModelerPage />} />
            <Route path="constraints" element={<ConstraintLibraryPage />} />
            <Route path="intelligence/templates" element={<PricingTemplateLibraryPage />} />
            <Route path="intelligence/templates/:id" element={<PricingTemplateDetailPage />} />
            <Route path="intelligence/change-orders" element={<ChangeOrderAnalyticsPage />} />
            <Route path="intelligence/change-orders/queue" element={<ChangeOrderBackfillQueuePage />} />
            <Route path="intelligence/scope-factors" element={<ScopeFactorsAdminPage />} />
            <Route path="portfolio" element={<PortfolioDashboardPage />} />
            <Route path="portfolio/capital-timeline" element={<CapitalTimelinePage />} />
            <Route path="portfolio/cost-savings" element={<CostSavingsDetailPage />} />
            <Route path="portfolio/benchmarks" element={<PortfolioBenchmarksPage />} />
            <Route path="decision-hub" element={<DecisionHubPage />} />
            <Route path="settings/cross-tenant-participation" element={<CrossTenantParticipationPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}
