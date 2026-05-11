import { Router } from 'express';
import { z } from 'zod';
import { authenticateUser, loadOrgContext, requireRole, validateBody, auditLog } from '../middleware';
import { supabaseAdmin } from '../utils/supabase';
import { AuthenticatedRequest } from '../middleware/authenticateUser';

const router = Router();
const auth = [authenticateUser, loadOrgContext];

const BUCKET = 'property-documents';

const DOC_TYPES = ['deed','survey','appraisal','inspection','insurance','permit','contract','invoice','photo','plan','other'] as const;

const UploadInitSchema = z.object({
  propertyId: z.string().uuid(),
  fileName: z.string().min(1),
  fileSize: z.number().int().positive(),
  mimeType: z.string(),
});

const SaveSchema = z.object({
  propertyId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  name: z.string().min(1),
  documentType: z.enum(DOC_TYPES),
  storagePath: z.string().min(1),
  fileName: z.string().min(1),
  fileSize: z.number().int().optional(),
  mimeType: z.string().optional(),
  description: z.string().optional(),
});

router.get('/', ...auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { propertyId } = req.query as Record<string, string>;
    let q = supabaseAdmin
      .from('property_documents')
      .select('*')
      .eq('org_id', req.orgId!);
    if (propertyId) q = q.eq('property_id', propertyId);
    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ data });
  } catch (err) { next(err); }
});

router.post('/upload-init', ...auth, requireRole('analyst'), validateBody(UploadInitSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { propertyId, fileName, fileSize, mimeType } = req.body;
    const storagePath = `${req.orgId}/${propertyId}/${Date.now()}_${fileName}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUploadUrl(storagePath);

    if (uploadError) return res.status(400).json({ error: uploadError.message });

    res.json({ data: { signedUrl: uploadData.signedUrl, storagePath, token: uploadData.token } });
  } catch (err) { next(err); }
});

router.post('/', ...auth, requireRole('analyst'), validateBody(SaveSchema), auditLog('create', 'property_documents'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const body = req.body;
    const { data, error } = await supabaseAdmin
      .from('property_documents')
      .insert({
        org_id: req.orgId,
        property_id: body.propertyId,
        project_id: body.projectId,
        name: body.name,
        document_type: body.documentType,
        storage_path: body.storagePath,
        file_name: body.fileName,
        file_size: body.fileSize,
        mime_type: body.mimeType,
        description: body.description,
        uploaded_by: req.userId,
      })
      .select().single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ data });
  } catch (err) { next(err); }
});

router.get('/:id/download', ...auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: doc, error: fetchErr } = await supabaseAdmin
      .from('property_documents')
      .select('storage_path, file_name')
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .single();
    if (fetchErr || !doc) return res.status(404).json({ error: 'Not found' });

    const { data: urlData, error: urlErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 300);
    if (urlErr || !urlData) return res.status(500).json({ error: 'Could not generate download URL' });
    res.json({ data: { url: urlData.signedUrl } });
  } catch (err) { next(err); }
});

router.delete('/:id', ...auth, requireRole('analyst'), auditLog('delete', 'property_documents'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { data: doc, error: fetchErr } = await supabaseAdmin
      .from('property_documents')
      .select('storage_path')
      .eq('id', req.params.id)
      .eq('org_id', req.orgId!)
      .single();
    if (fetchErr || !doc) return res.status(404).json({ error: 'Not found' });

    await supabaseAdmin.storage.from(BUCKET).remove([doc.storage_path]);
    await supabaseAdmin.from('property_documents').delete().eq('id', req.params.id).eq('org_id', req.orgId!);
    res.json({ data: { deleted: true } });
  } catch (err) { next(err); }
});

export default router;
