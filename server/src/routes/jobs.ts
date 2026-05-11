import { Router, Request, Response, NextFunction } from 'express';
import { runBudgetReconciliation } from '../jobs/budget-reconciliation';
import { runScenarioRecalc } from '../jobs/scenario-recalc-job';

const router = Router();

// Vercel Cron Secret guard — rejects any call without the correct bearer token.
function requireCronSecret(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // In development, allow through when no secret is set.
    if (process.env.NODE_ENV !== 'production') return next();
    return res.status(500).json({ error: 'CRON_SECRET not configured' });
  }
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// GET /api/v1/jobs/budget-reconciliation
// Invoked nightly by Vercel Cron. Protected by CRON_SECRET bearer token.
router.get('/budget-reconciliation', requireCronSecret, async (_req, res, next) => {
  try {
    const result = await runBudgetReconciliation();
    res.json({ data: result });
  } catch (err) { next(err); }
});

// GET /api/v1/jobs/scenario-recalc
// Invoked every 5 minutes by Vercel Cron. Protected by CRON_SECRET bearer token.
router.get('/scenario-recalc', requireCronSecret, async (_req, res, next) => {
  try {
    const result = await runScenarioRecalc();
    res.json({ data: result });
  } catch (err) { next(err); }
});

export default router;
