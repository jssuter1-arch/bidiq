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
import Textarea from '@/components/ui/Textarea';
import CurrencyInput from '@/components/ui/CurrencyInput';
import Toggle from '@/components/ui/Toggle';
import Skeleton from '@/components/ui/Skeleton';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']),
  projectType: z.enum(['renovation', 'new_construction', 'repair', 'capital_improvement', 'unit_turn']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  startDate: z.string().optional(),
  targetCompletion: z.string().optional(),
  hasConstructionLoan: z.boolean(),
  loanAmount: z.number().nonnegative().optional(),
  lenderName: z.string().optional(),
  loanInterestRate: z.number().min(0).max(100).optional(),
});

type FormData = z.infer<typeof schema>;

export default function EditProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasLoan, setHasLoan] = useState(false);
  const [loanAmount, setLoanAmount] = useState(0);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    api.get(`/v1/projects/${id}`).then((r) => {
      const p = r.data.data;
      setHasLoan(p.has_construction_loan ?? false);
      setLoanAmount(p.loan_amount || 0);
      reset({
        name: p.name,
        description: p.description,
        status: p.status,
        projectType: p.project_type,
        priority: p.priority,
        startDate: p.start_date?.slice(0, 10),
        targetCompletion: p.target_completion?.slice(0, 10),
        hasConstructionLoan: p.has_construction_loan ?? false,
        loanAmount: p.loan_amount ?? undefined,
        lenderName: p.lender_name ?? undefined,
        loanInterestRate: p.loan_interest_rate ?? undefined,
      });
    }).finally(() => setLoading(false));
  }, [id, reset]);

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      await api.patch(`/v1/projects/${id}`, data);
      toast.success('Project updated');
      navigate(`/projects/${id}`);
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
        title="Edit Project"
        actions={<Button variant="ghost" onClick={() => navigate(`/projects/${id}`)}>Cancel</Button>}
      />
      <Card className="max-w-xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Project Name" fullWidth error={errors.name?.message} {...register('name')} />
          <Textarea label="Description" fullWidth {...register('description')} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Status" options={[
              { value: 'planning', label: 'Planning' },
              { value: 'active', label: 'Active' },
              { value: 'on_hold', label: 'On Hold' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
            ]} fullWidth {...register('status')} />
            <Select label="Type" options={[
              { value: 'renovation', label: 'Renovation' },
              { value: 'new_construction', label: 'New Construction' },
              { value: 'repair', label: 'Repair' },
              { value: 'capital_improvement', label: 'Capital Improvement' },
              { value: 'unit_turn', label: 'Unit Turn' },
            ]} fullWidth {...register('projectType')} />
          </div>
          <Select label="Priority" options={[
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'critical', label: 'Critical' },
          ]} fullWidth {...register('priority')} />
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
                <CurrencyInput label="Loan Amount" value={loanAmount} onChange={(v) => { setLoanAmount(v); setValue('loanAmount', v); }} />
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
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={saving}>Save Changes</Button>
            <Button type="button" variant="ghost" onClick={() => navigate(`/projects/${id}`)}>Cancel</Button>
          </div>
        </form>
      </Card>
    </PageWrapper>
  );
}
