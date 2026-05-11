import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Skeleton from '@/components/ui/Skeleton';

const schema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  contactName: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  licenseNumber: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  defaultRate: z.coerce.number().optional(),
  rateType: z.enum(['hourly', 'daily', 'fixed', 'per_sqft', 'per_unit']).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
});

type FormData = z.infer<typeof schema>;

const SPECIALTIES = [
  'general_contractor', 'electrical', 'plumbing', 'hvac', 'roofing',
  'framing', 'drywall', 'painting', 'flooring', 'windows', 'insulation', 'landscaping',
];

export default function EditContractorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    api.get(`/v1/contractors/${id}`).then((r) => {
      const c = r.data.data;
      setSelectedSpecialties(c.specialties || []);
      reset({
        companyName: c.company_name,
        contactName: c.contact_name,
        email: c.email,
        phone: c.phone,
        licenseNumber: c.license_number,
        city: c.city,
        state: c.state,
        defaultRate: c.default_rate,
        rateType: c.rate_type,
        rating: c.rating,
      });
    }).finally(() => setLoading(false));
  }, [id, reset]);

  const toggleSpecialty = (s: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      await api.patch(`/v1/contractors/${id}`, { ...data, specialties: selectedSpecialties });
      toast.success('Contractor updated');
      navigate(`/contractors/${id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageWrapper><Skeleton className="h-8 w-48" count={5} /></PageWrapper>;

  return (
    <PageWrapper>
      <PageHeader
        title="Edit Contractor"
        actions={<Button variant="ghost" onClick={() => navigate(`/contractors/${id}`)}>Cancel</Button>}
      />
      <Card className="max-w-2xl space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Company Name" fullWidth error={errors.companyName?.message} {...register('companyName')} />
            <Input label="Contact Name" fullWidth {...register('contactName')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" fullWidth error={errors.email?.message} {...register('email')} />
            <Input label="Phone" fullWidth {...register('phone')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="City" fullWidth {...register('city')} />
            <Input label="State" fullWidth {...register('state')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="License #" fullWidth {...register('licenseNumber')} />
            <Select
              label="Rate Type"
              options={[
                { value: 'hourly', label: 'Hourly' },
                { value: 'daily', label: 'Daily' },
                { value: 'fixed', label: 'Fixed' },
                { value: 'per_sqft', label: 'Per Sq Ft' },
                { value: 'per_unit', label: 'Per Unit' },
              ]}
              placeholder="Select rate type"
              fullWidth
              {...register('rateType')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Default Rate ($)" type="number" fullWidth {...register('defaultRate')} />
            <Select
              label="Rating"
              options={[1, 2, 3, 4, 5].map((r) => ({ value: String(r), label: `${r} star${r > 1 ? 's' : ''}` }))}
              placeholder="Select rating"
              fullWidth
              {...register('rating')}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--text-secondary)]">Specialties</p>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSpecialty(s)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all capitalize ${
                    selectedSpecialties.includes(s)
                      ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={saving}>Save Changes</Button>
            <Button type="button" variant="ghost" onClick={() => navigate(`/contractors/${id}`)}>Cancel</Button>
          </div>
        </form>
      </Card>
    </PageWrapper>
  );
}
