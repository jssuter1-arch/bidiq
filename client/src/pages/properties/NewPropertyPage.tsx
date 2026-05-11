import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import CurrencyInput from '@/components/ui/CurrencyInput';
import Textarea from '@/components/ui/Textarea';
import { ArrowLeft } from 'lucide-react';

const schema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  zip: z.string().min(5),
  propertyType: z.enum(['single_family', 'multi_family', 'commercial', 'mixed_use', 'land']),
  unitCount: z.number().int().min(1).default(1),
  purchasePrice: z.number().nonnegative().optional(),
  currentValue: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewPropertyPage() {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { unitCount: 1 } });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await api.post('/v1/properties', data);
      toast.success('Property created');
      navigate(`/properties/${res.data.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create property');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper>
      <PageHeader
        title="Add Property"
        actions={<Button variant="ghost" iconLeft={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/properties')}>Back</Button>}
      />
      <Card className="max-w-xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Property Name" error={errors.name?.message} fullWidth {...register('name')} />
          <Input label="Street Address" error={errors.address?.message} fullWidth {...register('address')} />
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1"><Input label="City" error={errors.city?.message} fullWidth {...register('city')} /></div>
            <div><Input label="State" placeholder="MA" maxLength={2} error={errors.state?.message} fullWidth {...register('state')} /></div>
            <div><Input label="ZIP" error={errors.zip?.message} fullWidth {...register('zip')} /></div>
          </div>
          <Select
            label="Property Type"
            options={[
              { value: 'single_family', label: 'Single Family' },
              { value: 'multi_family', label: 'Multi Family' },
              { value: 'commercial', label: 'Commercial' },
              { value: 'mixed_use', label: 'Mixed Use' },
              { value: 'land', label: 'Land' },
            ]}
            error={errors.propertyType?.message}
            fullWidth
            {...register('propertyType')}
          />
          <Input label="Unit Count" type="number" min={1} error={errors.unitCount?.message} fullWidth {...register('unitCount', { valueAsNumber: true })} />
          <div className="grid grid-cols-2 gap-3">
            <CurrencyInput label="Purchase Price" onChange={(v) => setValue('purchasePrice', v)} />
            <CurrencyInput label="Current Value" onChange={(v) => setValue('currentValue', v)} />
          </div>
          <Textarea label="Notes (optional)" fullWidth {...register('notes')} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => navigate('/properties')}>Cancel</Button>
            <Button type="submit" loading={loading}>Create Property</Button>
          </div>
        </form>
      </Card>
    </PageWrapper>
  );
}
