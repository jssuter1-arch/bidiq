import { useEffect, useState } from 'react';
import { Calculator, Save, TrendingUp } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import CurrencyInput from '@/components/ui/CurrencyInput';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Table from '@/components/ui/Table';
import { formatCurrency, formatPercent, formatMultiple, formatDate } from '@/utils/format';

interface Analysis {
  purchasePrice: number;
  renovationCost: number;
  closingCosts: number;
  holdingCosts: number;
  financingCosts: number;
  arv: number;
  monthlyNoi: number;
}

function compute(a: Analysis) {
  const totalInvestment = a.purchasePrice + a.renovationCost + a.closingCosts + a.holdingCosts + a.financingCosts;
  const valueCreated = a.arv - a.purchasePrice;
  const equityCaptured = a.arv - totalInvestment;
  const roiMultiple = totalInvestment > 0 ? a.arv / totalInvestment : 0;
  const roiPercentage = totalInvestment > 0 ? (equityCaptured / totalInvestment) * 100 : 0;
  const paybackMonths = a.monthlyNoi > 0 ? Math.ceil(totalInvestment / a.monthlyNoi) : null;
  return { totalInvestment, valueCreated, equityCaptured, roiMultiple, roiPercentage, paybackMonths };
}

export default function EquityPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [saved, setSaved] = useState<any[]>([]);
  const [fields, setFields] = useState<Analysis>({ purchasePrice: 0, renovationCost: 0, closingCosts: 0, holdingCosts: 0, financingCosts: 0, arv: 0, monthlyNoi: 0 });
  const [propertyId, setPropertyId] = useState('');
  const [analysisName, setAnalysisName] = useState('');
  const [saving, setSaving] = useState(false);

  const results = compute(fields);

  useEffect(() => {
    Promise.all([
      api.get('/v1/properties', { params: { limit: 100 } }),
      api.get('/v1/equity', { params: { isSaved: true, limit: 20 } }),
    ]).then(([p, e]) => {
      setProperties(p.data.data || []);
      setSaved(e.data.data || []);
    });
  }, []);

  const setField = (key: keyof Analysis) => (v: number) => setFields((prev) => ({ ...prev, [key]: v }));

  const handleSave = async () => {
    if (!propertyId || !analysisName) return toast.error('Select a property and enter a name');
    setSaving(true);
    try {
      const res = await api.post('/v1/equity', { ...fields, ...results, propertyId, name: analysisName, isSaved: true });
      setSaved((prev) => [res.data.data, ...prev]);
      toast.success('Analysis saved');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageWrapper>
      <PageHeader title="Equity Calculator" subtitle="Model renovation returns and capture equity scenarios" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Calculator className="w-4 h-4 text-brand-400" /> Inputs
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <CurrencyInput label="Purchase Price" value={fields.purchasePrice} onChange={setField('purchasePrice')} />
            <CurrencyInput label="Renovation Cost" value={fields.renovationCost} onChange={setField('renovationCost')} />
            <CurrencyInput label="Closing Costs" value={fields.closingCosts} onChange={setField('closingCosts')} />
            <CurrencyInput label="Holding Costs" value={fields.holdingCosts} onChange={setField('holdingCosts')} />
            <CurrencyInput label="Financing Costs" value={fields.financingCosts} onChange={setField('financingCosts')} />
            <CurrencyInput label="ARV" value={fields.arv} onChange={setField('arv')} />
            <CurrencyInput label="Monthly NOI" value={fields.monthlyNoi} onChange={setField('monthlyNoi')} />
          </div>
        </Card>

        <Card className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-success" /> Results
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Total Investment', value: formatCurrency(results.totalInvestment) },
              { label: 'Value Created', value: formatCurrency(results.valueCreated), positive: results.valueCreated > 0 },
              { label: 'Equity Captured', value: formatCurrency(results.equityCaptured), positive: results.equityCaptured > 0 },
              { label: 'ROI Multiple', value: formatMultiple(results.roiMultiple), positive: results.roiMultiple >= 1 },
              { label: 'ROI %', value: formatPercent(results.roiPercentage), positive: results.roiPercentage > 0 },
              { label: 'Payback (months)', value: results.paybackMonths ? String(results.paybackMonths) : '—' },
            ].map((r) => (
              <div key={r.label} className="p-3 rounded-lg bg-[var(--bg-elevated)] space-y-1">
                <p className="text-xs text-[var(--text-tertiary)]">{r.label}</p>
                <p className={`text-lg font-mono font-semibold ${r.positive === undefined ? 'text-[var(--text-primary)]' : r.positive ? 'text-success' : 'text-danger'}`}>
                  {r.value}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-2 space-y-3 border-t border-[var(--border-subtle)]">
            <p className="text-xs font-semibold text-[var(--text-secondary)]">Save Analysis</p>
            <Select options={properties.map((p) => ({ value: p.id, label: p.name }))} placeholder="Select property" value={propertyId} onChange={(e) => setPropertyId(e.target.value)} fullWidth />
            <Input placeholder="Analysis name" value={analysisName} onChange={(e) => setAnalysisName(e.target.value)} fullWidth />
            <Button iconLeft={<Save className="w-4 h-4" />} onClick={handleSave} loading={saving} fullWidth variant="secondary">
              Save Analysis
            </Button>
          </div>
        </Card>
      </div>

      {saved.length > 0 && (
        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Saved Analyses</h3>
          <Table
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'properties', header: 'Property', render: (r: any) => r.properties?.name || '—' },
              { key: 'total_investment', header: 'Investment', align: 'right', render: (r: any) => <span className="font-mono">{formatCurrency(r.total_investment)}</span> },
              { key: 'arv', header: 'ARV', align: 'right', render: (r: any) => <span className="font-mono">{formatCurrency(r.arv)}</span> },
              { key: 'roi_multiple', header: 'Multiple', render: (r: any) => formatMultiple(r.roi_multiple) },
              { key: 'roi_percentage', header: 'ROI %', render: (r: any) => formatPercent(r.roi_percentage) },
              { key: 'created_at', header: 'Saved', render: (r: any) => formatDate(r.created_at) },
            ]}
            data={saved}
            emptyText="No saved analyses"
          />
        </Card>
      )}
    </PageWrapper>
  );
}
