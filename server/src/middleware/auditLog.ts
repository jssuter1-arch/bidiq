import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authenticateUser';
import { supabaseAdmin } from '../utils/supabase';

type AuditAction = 'create' | 'update' | 'delete' | 'export' | 'import' | 'approve' | 'deny';

export function auditLog(action: AuditAction, tableName: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      if (res.statusCode < 400 && req.orgId) {
        supabaseAdmin.from('audit_log').insert({
          org_id: req.orgId,
          user_id: req.userId,
          action,
          table_name: tableName,
          record_id: body?.data?.id || req.params.id || null,
          new_values: ['create', 'update'].includes(action) ? req.body : null,
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
        }).then(null, () => {});
      }
      return originalJson(body);
    };

    next();
  };
}
