import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/authenticateUser';
import { supabaseAdmin } from './supabase';
import { SupabaseClient } from '@supabase/supabase-js';

function toSnakeCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)] = value;
  }
  return result;
}

type QueryBuilder = (
  sb: SupabaseClient,
  orgId: string,
  params: Record<string, any>
) => any;

export function listHandler(table: string, customQuery?: QueryBuilder) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { page = '1', limit = '50', ...filters } = req.query as Record<string, string>;
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
      const from = (pageNum - 1) * limitNum;

      let query = customQuery
        ? customQuery(supabaseAdmin, req.orgId!, filters)
        : supabaseAdmin.from(table).select('*', { count: 'exact' }).eq('org_id', req.orgId!);

      const { data, error, count } = await query.range(from, from + limitNum - 1);
      if (error) return res.status(400).json({ error: error.message });
      res.json({ data, meta: { page: pageNum, limit: limitNum, total: count } });
    } catch (err) { next(err); }
  };
}

export function getHandler(table: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { data, error } = await supabaseAdmin
        .from(table)
        .select('*')
        .eq('id', req.params.id)
        .eq('org_id', req.orgId!)
        .single();
      if (error || !data) return res.status(404).json({ error: 'Not found' });
      res.json({ data });
    } catch (err) { next(err); }
  };
}

export function createHandler(table: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { data, error } = await supabaseAdmin
        .from(table)
        .insert({ ...toSnakeCase(req.body), org_id: req.orgId, created_by: req.userId })
        .select()
        .single();
      if (error) return res.status(400).json({ error: error.message });
      res.status(201).json({ data });
    } catch (err) { next(err); }
  };
}

export function updateHandler(table: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { data: existing } = await supabaseAdmin
        .from(table).select('id').eq('id', req.params.id).eq('org_id', req.orgId!).single();
      if (!existing) return res.status(404).json({ error: 'Not found' });

      const { data, error } = await supabaseAdmin
        .from(table)
        .update(toSnakeCase(req.body))
        .eq('id', req.params.id)
        .eq('org_id', req.orgId!)
        .select()
        .single();
      if (error) return res.status(400).json({ error: error.message });
      res.json({ data });
    } catch (err) { next(err); }
  };
}

export function deleteHandler(table: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { data: existing } = await supabaseAdmin
        .from(table).select('id').eq('id', req.params.id).eq('org_id', req.orgId!).single();
      if (!existing) return res.status(404).json({ error: 'Not found' });

      const { error } = await supabaseAdmin
        .from(table).delete().eq('id', req.params.id).eq('org_id', req.orgId!);
      if (error) return res.status(400).json({ error: error.message });
      res.status(204).end();
    } catch (err) { next(err); }
  };
}
