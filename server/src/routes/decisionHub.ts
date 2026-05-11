import { Router, Response, NextFunction } from 'express';
import { authenticateUser, loadOrgContext, requireModuleAccess } from '../middleware';
import { getCachedDecisionHub, invalidateDecisionHubCache } from '../services/decision-hub-service';
import { AuthenticatedRequest } from '../middleware/authenticateUser';

const router = Router();
const auth = [authenticateUser, loadOrgContext, requireModuleAccess('portfolio_intelligence')];

// GET /api/v1/decision-hub
router.get('/', auth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { type, urgency } = req.query as Record<string, string>;
    let result = await getCachedDecisionHub(req.orgId!, req.userId!);

    // Filter client-side after cache hit
    let items = result.items;
    if (type) {
      const types = type.split(',');
      items = items.filter((i) => types.includes(i.type));
    }
    if (urgency) {
      const urgencies = urgency.split(',');
      items = items.filter((i) => urgencies.includes(i.urgency));
    }

    res.json({
      data: {
        items,
        counts: result.counts,
        computed_at: result.computed_at,
      },
    });
  } catch (err) { next(err); }
});

// POST /api/v1/decision-hub/invalidate — force cache refresh
router.post('/invalidate', auth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await invalidateDecisionHubCache(req.orgId!);
    res.json({ data: { ok: true } });
  } catch (err) { next(err); }
});

export default router;
