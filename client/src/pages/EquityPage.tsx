import { useEffect, useState } from 'react';
import { Calculator, Save, TrendingUp, Download } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
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
import EquityReportPDF from '@/components/pdf/EquityReportPDF';
import { formatCurrency, formatPercent, formatMultiple, formatDate } from '@/utils/format';

interface Inputs {
  renovationCost: number;
  preRenovationRentPerUnit: number;
  postRenovationRentPerUnit: number;
  unitsAffected: number;
  capRate: number;
}

function compute(a: Inputs) {
  const monthlyRentIncreasePerUnit = a.postRenovationRentPerUnit - a.preRenovationRentPerUnit;
  const totalMonthlyRentIncrease = monthlyRentIncreasePerUnit * a.unitsAffected;
  const annualRentIncrease = totalMonthlyRentIncrease * 12;
  const valueCreated = a.capRate > 0 ? annualRentIncrease / a.capRate : 0;
  const roiMultiple = a.renovationCost > 0 ? valueCreated / a.renovationCost : 0;
  const roiPercentage = a.renovationCost > 0 ? ((valueCreated - a.renovationCost) / a.renovationCost) * 100 : 0;
  const paybackMonths = totalMonthlyRentIncrease > 0 ? Math.ceil(a.renovationCost / totalMonthlyRentIncrease) : null;
  return { monthlyRentIncreasePerUnit, totalMonthlyRentIncrease, annualRentIncrease, valueCreated, roiMultiple, roiPercentage, paybackMonths };
}

export default function EquityPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [saved, setSaved] = useState<any[]>([]);
  const [fields, setFields] = useState<Inputs>({
    renovationCost: 0,
    preRenovationRentPerUnit: 0,
    postRenovationRentPerUnit: 0,
    unitsAffected: 1,
    capRate: 0.06,
  });
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

  const setField = (key: keyof Inputs) => (v: number) => setFields((prev) => ({ ...prev, [key]: v }));

  const handleSave = async () => {
    if (!propertyId || !analysisName) return toast.error('Select a property and enter a name');
    setSaving(true);
    try {
      const res = await api.post('/v1/equity', { ...fields, propertyId, name: analysisName, isSaved: true });
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
      <PageHeader title="Equity Calculator" subtitle="Model renovation returns using income capitalization" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Calculator className="w-4 h-4 text-brand-400" /> Inputs
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <CurrencyInput label="Renovation Cost" value={fields.renovationCost} onChange={setField('renovationCost')} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--text-secondary)]">Units Affected</label>
              <input
                type="number"
                min={1}
                value={fields.unitsAffected}
                onChange={(e) => setFields((prev) => ({ ...prev, unitsAffected: Math.max(1, parseInt(e.target.value) || 1) }))}
                className="w-full rounded-lg border bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-default)] focus:border-brand-500 focus:outline-none h-9 px-3 text-sm transition-colors"
              />
            </div>
            <CurrencyInput label="Pre-Renovation Rent / Unit" value={fields.preRenovationRentPerUnit} onChange={setField('preRenovationRentPerUnit')} />
            <CurrencyInput label="Post-Renovation Rent / Unit" value={fields.postRenovationRentPerUnit} onChange={setField('postRenovationRentPerUnit')} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--text-secondary)]">Cap Rate (%)</label>
              <input
                type="number"
                min={0.1}
                max={30}
                step={0.1}
                value={(fields.capRate * 100).toFixed(1)}
                onChange={(e) => setFields((prev) => ({ ...prev, capRate: (parseFloat(e.target.value) || 6) / 100 }))}
                className="w-full rounded-lg border bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-default)] focus:border-brand-500 focus:outline-none h-9 px-3 text-sm transition-colors"
              />
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-success" /> Results
          </h3>

          {/* Hero: Value Created */}
          <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/20 text-center space-y-1">
            <p className="text-xs font-medium text-brand-400 uppercase tracking-wide">Value Created</p>
            <p className="text-4xl font-mono font-bold text-brand-400">{formatCurrency(results.valueCreated)}</p>
            <p className="text-xs text-[var(--text-tertiary)]">
              {formatCurrency(results.annualRentIncrease)} annual income / {(fields.capRate * 100).toFixed(1)}% cap rate
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Monthly Rent Increase / Unit', value: formatCurrency(results.monthlyRentIncreasePerUnit) },
              { label: 'Total Monthly Increase', value: formatCurrency(results.totalMonthlyRentIncrease), positive: results.totalMonthlyRentIncrease > 0 },
              { label: 'Annual Rent Increase', value: formatCurrency(results.annualRentIncrease), positive: results.annualRentIncrease > 0 },
              { label: 'ROI Multiple', value: formatMultiple(results.roiMultiple), positive: results.roiMultiple >= 1 },
              { label: 'ROI %', value: formatPercent(results.roiPercentage), positive: results.roiPercentage > 0 },
              { label: 'Payback (months)', value: results.paybackMonths ? String(results.paybackMonths) : '—' },
            ].map((r) => (
              <div key={r.label} className="p-3 rounded-lg bg-[var(--bg-elevated)] space-y-1">
                <p className="text-xs text-[var(--text-tertiary)]">{r.label}</p>
                <p className={`text-base font-mono font-semibold ${r.positive === undefined ? 'text-[var(--text-primary)]' : r.positive ? 'text-success' : 'text-danger'}`}>
                  {r.value}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-2 space-y-3 border-t border-[var(--border-subtle)]">
            {results.valueCreated > 0 && (
              <PDFDownloadLink
                document={<EquityReportPDF analysisName={analysisName || 'Equity Analysis'} inputs={fields} results={results} />}
                fileName={`equity-report-${Date.now()}.pdf`}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <Button variant="ghost" size="sm" iconLeft={<Download className="w-3.5 h-3.5" />} fullWidth>
                  Download Report
                </Button>
              </PDFDownloadLink>
            )}
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
              { key: 'renovation_cost', header: 'Renovation', align: 'right', render: (r: any) => <span className="font-mono">{formatCurrency(r.renovation_cost)}</span> },
              { key: 'value_created', header: 'Value Created', align: 'right', render: (r: any) => <span className="font-mono text-success">{formatCurrency(r.value_created)}</span> },
              { key: 'roi_multiple', header: 'Multiple', render: (r: any) => formatMultiple(r.roi_multiple) },
              { key: 'payback_months', header: 'Payback (mo)', render: (r: any) => r.payback_months ?? '—' },
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
