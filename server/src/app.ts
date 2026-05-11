import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import propertiesRouter from './routes/properties';
import unitsRouter from './routes/units';
import projectsRouter from './routes/projects';
import lineItemsRouter from './routes/lineItems';
import invoicesRouter from './routes/invoices';
import contractorsRouter from './routes/contractors';
import permitsRouter from './routes/permits';
import loanDrawsRouter from './routes/loanDraws';
import equityRouter from './routes/equity';
import cashRouter from './routes/cash';
import yardiRouter from './routes/yardi';
import notificationsRouter from './routes/notifications';
import auditRouter from './routes/audit';
import benchmarksRouter from './routes/benchmarks';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import organizationsRouter from './routes/organizations';
import documentsRouter from './routes/documents';
import settingsRouter from './routes/settings';
import jobsRouter from './routes/jobs';
import dealsRouter from './routes/deals';
import dealUnderwritingRouter, { underwritingRouter } from './routes/underwriting';
import budgetLifecycleRouter from './routes/budgetLifecycle';
import constraintsRouter from './routes/constraints';
import scenariosRouter from './routes/scenarios';
import scenarioComparisonsRouter from './routes/scenarioComparisons';
import templatesRouter from './routes/templates';
import scopeFactorsRouter from './routes/scopeFactors';
import changeOrderAnalyticsRouter from './routes/changeOrderAnalytics';
import portfolioRouter from './routes/portfolio';
import decisionHubRouter from './routes/decisionHub';
import crossTenantParticipationRouter from './routes/crossTenantParticipation';

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');

app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimiter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/organizations', organizationsRouter);
app.use('/api/v1/documents', documentsRouter);
app.use('/api/v1/properties', propertiesRouter);
app.use('/api/v1/units', unitsRouter);
app.use('/api/v1/projects', projectsRouter);
app.use('/api/v1/line-items', lineItemsRouter);
app.use('/api/v1/invoices', invoicesRouter);
app.use('/api/v1/contractors', contractorsRouter);
app.use('/api/v1/permits', permitsRouter);
app.use('/api/v1/loan-draws', loanDrawsRouter);
app.use('/api/v1/equity', equityRouter);
app.use('/api/v1/cash', cashRouter);
app.use('/api/v1/yardi', yardiRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/audit', auditRouter);
app.use('/api/v1/benchmarks', benchmarksRouter);
app.use('/api/v1/settings', settingsRouter);
app.use('/api/v1/jobs', jobsRouter);
app.use('/api/v1/deals', dealsRouter);
app.use('/api/v1/deals/:dealId/underwriting', dealUnderwritingRouter);
app.use('/api/v1/underwriting', underwritingRouter);
app.use('/api/v1', budgetLifecycleRouter);
app.use('/api/v1/constraints', constraintsRouter);
app.use('/api/v1/scenarios', scenariosRouter);
app.use('/api/v1/scenario-comparisons', scenarioComparisonsRouter);
app.use('/api/v1/pricing-templates', templatesRouter);
app.use('/api/v1/scope-factors', scopeFactorsRouter);
app.use('/api/v1/change-orders', changeOrderAnalyticsRouter);
app.use('/api/v1/portfolio', portfolioRouter);
app.use('/api/v1/decision-hub', decisionHubRouter);
app.use('/api/v1/cross-tenant-participation', crossTenantParticipationRouter);

app.use(errorHandler);

export default app;
