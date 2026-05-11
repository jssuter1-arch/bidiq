import { useEffect, useState } from 'react';
import { FileText, ChevronDown, ChevronUp, X } from 'lucide-react';
import api from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import { formatCurrency } from '@/utils/format';

interface DraftLineItem {
  category: string;
  description: string;
  unit_id?: string;
  budgeted_amount: number;
  source: 'template' | 'benchmark' | 'manual';
}

interface Props {
  propertyId?: string;
  scenarioId?: string;
  onApply: (lineItems: DraftLineItem[], total: number, warnings: string[]) => void;
}

export default function TemplateScopePicker({ propertyId, scenarioId, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [useOrgBenchmarks, setUseOrgBenchmarks] = useState(true);
  const [applying, setApplying] = useState(false);
  const [preview, setPreview] = useState<{ lineItems: DraftLineItem[]; total: number; warnings: string[] } | null>(null);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);

  useEffect(() => {
    if (open && !templatesLoaded) {
      api.get('/v1/pricing-templates')
        .then((r) => setTemplates((r.data.data ?? []).filter((t: any) => t.is_active)))
        .catch(() => {})
        .finally(() => setTemplatesLoaded(true));
    }
  }, [open, templatesLoaded]);

  const handleApply = async () => {
    if (!selectedTemplateId || !propertyId) return;
    setApplying(true);
    try {
      const { data } = await api.post(`/v1/pricing-templates/${selectedTemplateId}/apply`, {
        propertyId,
        useOrgBenchmarks,
        unitScopes: [],
        propertyLevelScopes: [],
        usedInScenarioId: scenarioId ?? undefined,
      });
      const result = { lineItems: data.lineItems, total: data.total_budgeted, warnings: data.warnings };
      setPreview(result);
    } catch {
      // ignore — parent will see no data
    } finally {
      setApplying(false);
    }
  };

  const handleConfirm = () => {
    if (preview) {
      onApply(preview.lineItems, preview.total, preview.warnings);
      setPreview(null);
      setOpen(false);
    }
  };

  if (!propertyId) return null;

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 transition-colors"
      >
        <FileText className="w-3.5 h-3.5" />
        Use pricing template to pre-fill scope
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <Card className="mt-3 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">Template Scope Picker</h4>
            <button onClick={() => setOpen(false)}>
              <X className="w-4 h-4 text-[var(--text-tertiary)]" />
            </button>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Select
                label="Pricing template"
                options={[
                  { value: '', label: '— Select template —' },
                  ...templates.map((t) => ({ value: t.id, label: t.name })),
                ]}
                value={selectedTemplateId}
                onChange={(e) => { setSelectedTemplateId(e.target.value); setPreview(null); }}
                fullWidth
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] pb-1 whitespace-nowrap cursor-pointer">
              <input
                type="checkbox"
                checked={useOrgBenchmarks}
                onChange={(e) => setUseOrgBenchmarks(e.target.checked)}
                className="rounded"
              />
              Benchmark fallback
            </label>
            <Button
              size="sm"
              onClick={handleApply}
              loading={applying}
              disabled={!selectedTemplateId}
            >
              Preview
            </Button>
          </div>

          {preview && (
            <div className="space-y-3 border-t border-[var(--border-subtle)] pt-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--text-secondary)]">
                  <span className="font-medium text-[var(--text-primary)]">{preview.lineItems.length}</span> draft line items
                  — total <span className="font-medium text-[var(--text-primary)]">{formatCurrency(preview.total)}</span>
                </p>
                <Button size="sm" onClick={handleConfirm}>Apply to Scenario</Button>
              </div>

              {preview.warnings.length > 0 && (
                <div className="space-y-1">
                  {preview.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-amber-400">{w}</p>
                  ))}
                </div>
              )}

              <div className="space-y-1 max-h-48 overflow-y-auto">
                {preview.lineItems.map((li, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="capitalize text-[var(--text-secondary)]">{li.category.replace(/_/g, ' ')}</span>
                      <Badge variant={li.source === 'benchmark' ? 'warning' : 'default'} size="sm">{li.source}</Badge>
                    </div>
                    <span className="font-mono text-[var(--text-primary)]">{formatCurrency(li.budgeted_amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
