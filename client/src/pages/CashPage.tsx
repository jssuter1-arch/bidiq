import { useEffect, useState, useMemo } from 'react';
import { Plus, Building2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import api from '@/services/api';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Tabs from '@/components/ui/Tabs';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import CurrencyInput from '@/components/ui/CurrencyInput';
import CashFlowChart from '@/components/charts/CashFlowChart';
import { formatCurrency, formatDate } from '@/utils/format';

const ACCOUNT_TYPES = ['checking','savings','construction_loan','escrow','reserve'] as const;

const accountSchema = z.object({
  name: z.string().min(1, 'Name required'),
  accountType: z.enum(ACCOUNT_TYPES),
  institution: z.string().optional(),
  accountNumberLast4: z.string().max(4).optional(),
  currentBalance: z.number().default(0),
});
type AccountForm = z.infer<typeof accountSchema>;

const CATEGORIES = [
  'mortgage', 'rent_income', 'contractor_payment', 'permit_fee',
  'insurance', 'tax', 'utility', 'management_fee', 'loan_draw',
  'equity_injection', 'sale_proceeds', 'deposit', 'refund', 'other',
] as const;

const txSchema = z.object({
  accountId: z.string().min(1, 'Account required'),
  category: z.enum(CATEGORIES),
  description: z.string().min(1, 'Description required'),
  amount: z.number().positive('Must be > 0'),
  transactionType: z.enum(['debit', 'credit']),
  transactionDate: z.string().min(1, 'Date required'),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

type TxForm = z.infer<typeof txSchema>;

export default function CashPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('accounts');
  const [modalOpen, setModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<TxForm>({
    resolver: zodResolver(txSchema),
    defaultValues: { transactionType: 'debit', transactionDate: new Date().toISOString().slice(0, 10) },
  });

  const { register: regAcct, handleSubmit: handleAcctSubmit, setValue: setAcctValue, reset: resetAcct, formState: { errors: acctErrors } } = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    defaultValues: { accountType: 'checking', currentBalance: 0 },
  });

  useEffect(() => {
    Promise.all([
      api.get('/v1/cash/accounts'),
      api.get('/v1/cash/transactions', { params: { limit: 100 } }),
    ]).then(([a, t]) => {
      setAccounts(a.data.data || []);
      setTransactions(t.data.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const totalBalance = accounts.reduce((s, a) => s + (a.current_balance || 0), 0);

  const chartData = useMemo(() => {
    const byMonth: Record<string, { inflows: number; outflows: number }> = {};
    transactions.forEach((t) => {
      const month = t.transaction_date?.slice(0, 7);
      if (!month) return;
      if (!byMonth[month]) byMonth[month] = { inflows: 0, outflows: 0 };
      if (t.transaction_type === 'credit') byMonth[month].inflows += Number(t.amount);
      else byMonth[month].outflows += Number(t.amount);
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([period, vals]) => ({ period, ...vals }));
  }, [transactions]);

  const onAccountSubmit = async (data: AccountForm) => {
    setAccountSaving(true);
    try {
      const res = await api.post('/v1/cash/accounts', data);
      setAccounts((prev) => [...prev, res.data.data]);
      toast.success('Account created');
      setAccountModalOpen(false);
      resetAcct();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create account');
    } finally {
      setAccountSaving(false);
    }
  };

  const onSubmit = async (data: TxForm) => {
    setSaving(true);
    try {
      const res = await api.post('/v1/cash/transactions', data);
      setTransactions((prev) => [res.data.data, ...prev]);
      toast.success('Transaction added');
      setModalOpen(false);
      reset();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add transaction');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageWrapper>
      <PageHeader
        title="Cash Management"
        subtitle={`Total balance: ${formatCurrency(totalBalance)}`}
        actions={
          <div className="flex gap-2">
            <Button iconLeft={<Building2 className="w-4 h-4" />} variant="ghost" onClick={() => setAccountModalOpen(true)}>
              Add Account
            </Button>
            <Button iconLeft={<Plus className="w-4 h-4" />} variant="secondary" onClick={() => setModalOpen(true)}>
              Add Transaction
            </Button>
          </div>
        }
      />

      {chartData.length > 0 && (
        <Card className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Cash Flow (Last 6 Months)</h3>
          <CashFlowChart data={chartData} />
        </Card>
      )}

      <Tabs
        tabs={[
          { id: 'accounts', label: 'Accounts', count: accounts.length },
          { id: 'transactions', label: 'Transactions', count: transactions.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'accounts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((a) => (
            <Card key={a.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{a.name}</p>
                  {a.institution && <p className="text-xs text-[var(--text-tertiary)]">{a.institution}</p>}
                </div>
                <Badge size="sm" variant="info" className="capitalize">{a.account_type?.replace('_', ' ')}</Badge>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)]">Balance</p>
                <p className="text-xl font-mono font-semibold text-[var(--text-primary)]">{formatCurrency(a.current_balance)}</p>
              </div>
              {a.account_number_last4 && <p className="text-xs text-[var(--text-tertiary)]">••••{a.account_number_last4}</p>}
            </Card>
          ))}
          {accounts.length === 0 && !loading && (
            <p className="text-sm text-[var(--text-tertiary)] col-span-3 py-8 text-center">No accounts</p>
          )}
        </div>
      )}

      {tab === 'transactions' && (
        <Table
          columns={[
            { key: 'transaction_date', header: 'Date', render: (r: any) => formatDate(r.transaction_date) },
            { key: 'description', header: 'Description' },
            { key: 'cash_accounts', header: 'Account', render: (r: any) => r.cash_accounts?.name || '—' },
            { key: 'category', header: 'Category', render: (r: any) => <span className="capitalize text-xs">{r.category?.replace(/_/g, ' ')}</span> },
            { key: 'amount', header: 'Amount', align: 'right', render: (r: any) => (
              <span className={`font-mono font-medium ${r.transaction_type === 'credit' ? 'text-success' : 'text-danger'}`}>
                {r.transaction_type === 'credit' ? '+' : '-'}{formatCurrency(r.amount)}
              </span>
            )},
            { key: 'is_reconciled', header: 'Reconciled', render: (r: any) => r.is_reconciled
              ? <Badge size="sm" variant="success" dot>Yes</Badge>
              : <Badge size="sm" variant="default">No</Badge>
            },
          ]}
          data={transactions}
          loading={loading}
          emptyText="No transactions"
        />
      )}

      <Modal open={accountModalOpen} onClose={() => { setAccountModalOpen(false); resetAcct(); }} title="Add Account" size="sm">
        <form onSubmit={handleAcctSubmit(onAccountSubmit)} className="space-y-3 p-4">
          <Input label="Account Name" fullWidth error={acctErrors.name?.message} {...regAcct('name')} />
          <Select
            label="Account Type"
            options={ACCOUNT_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))}
            fullWidth
            {...regAcct('accountType')}
          />
          <Input label="Institution" placeholder="e.g. Eastern Bank" fullWidth {...regAcct('institution')} />
          <Input label="Last 4 digits (optional)" maxLength={4} placeholder="1234" fullWidth {...regAcct('accountNumberLast4')} />
          <CurrencyInput label="Current Balance" onChange={(v) => setAcctValue('currentBalance', v)} />
          <div className="flex gap-3 pt-1">
            <Button type="submit" loading={accountSaving} fullWidth>Create Account</Button>
            <Button type="button" variant="ghost" onClick={() => { setAccountModalOpen(false); resetAcct(); }}>Cancel</Button>
          </div>
        </form>
      </Modal>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); reset(); }} title="Add Transaction" size="sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-4">
          <Select
            label="Account"
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            placeholder="Select account"
            error={errors.accountId?.message}
            fullWidth
            {...register('accountId')}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Type"
              options={[{ value: 'debit', label: 'Debit (out)' }, { value: 'credit', label: 'Credit (in)' }]}
              fullWidth
              {...register('transactionType')}
            />
            <Select
              label="Category"
              options={CATEGORIES.map((c) => ({ value: c, label: c.replace(/_/g, ' ') }))}
              fullWidth
              error={errors.category?.message}
              {...register('category')}
            />
          </div>
          <Input label="Description" fullWidth error={errors.description?.message} {...register('description')} />
          <div className="grid grid-cols-2 gap-3">
            <CurrencyInput label="Amount" onChange={(v) => setValue('amount', v)} />
            <Input label="Date" type="date" fullWidth error={errors.transactionDate?.message} {...register('transactionDate')} />
          </div>
          <Input label="Reference #" fullWidth {...register('referenceNumber')} />
          <div className="flex gap-3 pt-1">
            <Button type="submit" loading={saving} fullWidth>Add Transaction</Button>
            <Button type="button" variant="ghost" onClick={() => { setModalOpen(false); reset(); }}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </PageWrapper>
  );
}
