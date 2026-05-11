import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import CurrencyInput from '@/components/ui/CurrencyInput';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { AcquisitionDeal } from '@/types/deals';
import api from '@/services/api';

const SOURCE_OPTIONS = [
  { value: 'broker_om', label: 'Broker OM' },
  { value: 'off_market', label: 'Off-Market' },
  { value: 'referral', label: 'Referral' },
  { value: 'public_listing', label: 'Public Listing' },
  { value: 'other', label: 'Other' },
];

const PROPERTY_TYPE_OPTIONS = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'mixed_use', label: 'Mixed Use' },
];

const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

export default function EditDealPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deal, setDeal] = useState<AcquisitionDeal | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    dealName: '',
    source: '',
    sourceContactName: '',
    sourceContactEmail: '',
    sourceContactPhone: '',
    streetAddress: '',
    city: '',
    state: '',
    zip: '',
    propertyType: '',
    totalUnits: '',
    totalSqft: '',
    askingPrice: 0,
    expectedCloseDate: '',
    notes: '',
  });

  useEffect(() => {
    api.get(`/v1/deals/${id}`)
      .then((r) => {
        const d: AcquisitionDeal = r.data.data;
        setDeal(d);
        setForm({
          dealName: d.deal_name,
          source: d.source || '',
          sourceContactName: d.source_contact_name || '',
          sourceContactEmail: d.source_contact_email || '',
          sourceContactPhone: d.source_contact_phone || '',
          streetAddress: d.street_address || '',
          city: d.city || '',
          state: d.state || '',
          zip: d.zip || '',
          propertyType: d.property_type || '',
          totalUnits: d.total_units ? String(d.total_units) : '',
          totalSqft: d.total_sqft ? String(d.total_sqft) : '',
          askingPrice: d.asking_price || 0,
          expectedCloseDate: d.expected_close_date || '',
          notes: d.notes || '',
        });
      })
      .catch(() => navigate('/deals'))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.dealName.trim()) { setError('Deal name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, any> = { dealName: form.dealName };
      if (form.source !== undefined) payload.source = form.source || undefined;
      if (form.sourceContactName !== undefined) payload.sourceContactName = form.sourceContactName || undefined;
      if (form.sourceContactEmail !== undefined) payload.sourceContactEmail = form.sourceContactEmail || undefined;
      if (form.sourceContactPhone !== undefined) payload.sourceContactPhone = form.sourceContactPhone || undefined;
      if (form.streetAddress !== undefined) payload.streetAddress = form.streetAddress || undefined;
      if (form.city !== undefined) payload.city = form.city || undefined;
      if (form.state !== undefined) payload.state = form.state || undefined;
      if (form.zip !== undefined) payload.zip = form.zip || undefined;
      if (form.propertyType !== undefined) payload.propertyType = form.propertyType || undefined;
      if (form.totalUnits) payload.totalUnits = parseInt(form.totalUnits);
      if (form.totalSqft) payload.totalSqft = parseFloat(form.totalSqft);
      if (form.askingPrice) payload.askingPrice = form.askingPrice;
      if (form.expectedCloseDate !== undefined) payload.expectedCloseDate = form.expectedCloseDate || undefined;
      if (form.notes !== undefined) payload.notes = form.notes || undefined;

      await api.patch(`/v1/deals/${id}`, payload);
      navigate(`/deals/${id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update deal.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <PageWrapper>
      <PageHeader title="Edit Deal" />
      <div className="space-y-3 max-w-2xl">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32" />)}
      </div>
    </PageWrapper>
  );

  return (
    <PageWrapper>
      <PageHeader title={`Edit: ${deal?.deal_name}`} subtitle="Update deal information" />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <Card className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Deal Information</h3>
          <Input label="Deal Name *" value={form.dealName} onChange={(e) => set('dealName', e.target.value)} fullWidth />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Source" options={SOURCE_OPTIONS} value={form.source} onChange={(e) => set('source', e.target.value)} placeholder="Select source" fullWidth />
            <Input label="Expected Close Date" type="date" value={form.expectedCloseDate} onChange={(e) => set('expectedCloseDate', e.target.value)} fullWidth />
          </div>
        </Card>

        <Card className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Source Contact</h3>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Name" value={form.sourceContactName} onChange={(e) => set('sourceContactName', e.target.value)} fullWidth />
            <Input label="Email" type="email" value={form.sourceContactEmail} onChange={(e) => set('sourceContactEmail', e.target.value)} fullWidth />
          </div>
          <Input label="Phone" value={form.sourceContactPhone} onChange={(e) => set('sourceContactPhone', e.target.value)} fullWidth />
        </Card>

        <Card className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Property Details</h3>
          <Input label="Street Address" value={form.streetAddress} onChange={(e) => set('streetAddress', e.target.value)} fullWidth />
          <div className="grid grid-cols-3 gap-3">
            <Input label="City" value={form.city} onChange={(e) => set('city', e.target.value)} fullWidth />
            <Select label="State" options={STATES.map((s) => ({ value: s, label: s }))} value={form.state} onChange={(e) => set('state', e.target.value)} placeholder="—" fullWidth />
            <Input label="ZIP" value={form.zip} onChange={(e) => set('zip', e.target.value)} fullWidth />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Select label="Property Type" options={PROPERTY_TYPE_OPTIONS} value={form.propertyType} onChange={(e) => set('propertyType', e.target.value)} placeholder="—" fullWidth />
            <Input label="Units" type="number" min="1" value={form.totalUnits} onChange={(e) => set('totalUnits', e.target.value)} fullWidth />
            <Input label="Sq Ft" type="number" min="1" value={form.totalSqft} onChange={(e) => set('totalSqft', e.target.value)} fullWidth />
          </div>
          <CurrencyInput label="Asking Price" value={form.askingPrice || ''} onChange={(v) => set('askingPrice', v)} fullWidth />
        </Card>

        <Card className="space-y-3">
          <Textarea label="Notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} fullWidth />
        </Card>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={() => navigate(`/deals/${id}`)}>Cancel</Button>
          <Button type="submit" loading={saving}>Save Changes</Button>
        </div>
      </form>
    </PageWrapper>
  );
}
