import { useEffect, useState } from 'react';
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
import Textarea from '@/components/ui/Textarea';
import CurrencyInput from '@/components/ui/CurrencyInput';
import Toggle from '@/components/ui/Toggle';
import { ArrowLeft } from 'lucide-react';

const schema = z.object({
  propertyId: z.string().uuid('Required'),
  name: z.string().min(1),
  description: z.string().optional(),
  projectType: z.enum(['renovation', 'new_construction', 'repair', 'capital_improvement', 'unit_turn']),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  initialBudget: z.number().nonnegative(),
  startDate: z.string().optional(),
  targetCompletion: z.string().optional(),
  hasConstructionLoan: z.boolean().default(false),
  loanAmount: z.number().nonnegative().optional(),
  lenderName: z.string().optional(),
  loanInterestRate: z.number().min(0).max(100).optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewProjectPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [hasLoan, setHasLoan] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'medium', hasConstructionLoan: false },
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/v1/properties', { params: { limit: 100 } })
      .then((r) => setProperties(r.data.data || []));
  }, []);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await api.post('/v1/projects', { ...data, currentBudget: data.initialBudget });
      toast.success('Project created');
      navigate(`/projects/${res.data.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper>
      <PageHeader
        title="New Project"
        actions={<Button variant="ghost" iconLeft={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/projects')}>Back</Button>}
      />
      <Card className="max-w-xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            label="Property"
            options={properties.map((p) => ({ value: p.id, label: `${p.name} — ${p.city}` }))}
            placeholder="Select property"
            error={errors.propertyId?.message}
            fullWidth
            {...register('propertyId')}
          />
          <Input label="Project Name" error={errors.name?.message} fullWidth {...register('name')} />
          <Textarea label="Description" fullWidth {...register('description')} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" options={[
              { value: 'renovation', label: 'Renovation' },
              { value: 'new_construction', label: 'New Construction' },
              { value: 'repair', label: 'Repair' },
              { value: 'capital_improvement', label: 'Capital Improvement' },
              { value: 'unit_turn', label: 'Unit Turn' },
            ]} fullWidth {...register('projectType')} />
            <Select label="Priority" options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'critical', label: 'Critical' },
            ]} fullWidth {...register('priority')} />
          </div>
          <CurrencyInput label="Initial Budget" onChange={(v) => setValue('initialBudget', v)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date" type="date" fullWidth {...register('startDate')} />
            <Input label="Target Completion" type="date" fullWidth {...register('targetCompletion')} />
          </div>

          <Toggle
            label="Has Construction Loan"
            checked={hasLoan}
            onChange={(v) => { setHasLoan(v); setValue('hasConstructionLoan', v); }}
          />

          {hasLoan && (
            <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 p-4 space-y-3">
              <p className="text-xs font-semibold text-brand-400">Construction Loan Details</p>
              <div className="grid grid-cols-2 gap-3">
                <CurrencyInput label="Loan Amount" onChange={(v) => setValue('loanAmount', v)} />
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-[var(--text-secondary)]">Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    max={100}
                    placeholder="e.g. 7.5"
                    {...register('loanInterestRate', { valueAsNumber: true })}
                    className="w-full rounded-lg border bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-default)] focus:border-brand-500 focus:outline-none h-9 px-3 text-sm transition-colors"
                  />
                </div>
              </div>
              <Input label="Lender Name" placeholder="e.g. Eastern Bank" fullWidth {...register('lenderName')} />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => navigate('/projects')}>Cancel</Button>
            <Button type="submit" loading={loading}>Create Project</Button>
          </div>
        </form>
      </Card>
    </PageWrapper>
  );
}
