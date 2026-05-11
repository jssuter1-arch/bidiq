import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../utils/supabase';
import { AuthenticatedRequest } from './authenticateUser';

export function requireModuleAccess(moduleKey: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userId) return res.status(401).json({ error: 'Unauthenticated' });
    const { data, error } = await supabaseAdmin.rpc('user_has_module_access', {
      p_user_id: req.userId,
      p_module_key: moduleKey,
    });
    if (error || !data) {
      return res.status(403).json({
        error: true,
        code: 'MODULE_ACCESS_DENIED',
        message: `You do not have access to the ${moduleKey} module.`,
      });
    }
    next();
  };
}
