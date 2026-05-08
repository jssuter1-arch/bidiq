import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import PageWrapper from '@/components/layout/PageWrapper';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Tabs from '@/components/ui/Tabs';

export default function SettingsPage() {
  const [tab, setTab] = useState('org');
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const { userRole } = useAuthStore();

  const { register, handleSubmit } = useForm();

  useEffect(() => {
    if (tab === 'users') {
      setLoadingUsers(true);
      api.get('/v1/users', { params: { limit: 100 } })
        .then((r) => setUsers(r.data.data || []))
        .finally(() => setLoadingUsers(false));
    }
  }, [tab]);

  const onOrgSave = async (_data: any) => {
    toast.success('Settings saved (UI only — connect to API)');
  };

  const onInvite = async (data: any) => {
    try {
      await api.post('/v1/users/invite', data);
      toast.success('Invite sent');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to invite');
    }
  };

  return (
    <PageWrapper>
      <PageHeader title="Settings" />
      <Tabs tabs={[
        { id: 'org', label: 'Organization' },
        { id: 'users', label: 'Users & Roles' },
        { id: 'yardi', label: 'Yardi Integration' },
      ]} active={tab} onChange={setTab} />

      {tab === 'org' && (
        <Card className="max-w-lg space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Organization Settings</h3>
          <form onSubmit={handleSubmit(onOrgSave)} className="space-y-3">
            <Input label="Organization Name" fullWidth {...register('name')} />
            <Input label="URL Slug" fullWidth {...register('slug')} />
            <Select label="Plan" options={[{ value: 'starter', label: 'Starter' }, { value: 'growth', label: 'Growth' }, { value: 'enterprise', label: 'Enterprise' }]} fullWidth {...register('plan')} />
            <Button type="submit">Save Changes</Button>
          </form>
        </Card>
      )}

      {tab === 'users' && (
        <div className="space-y-6">
          {userRole === 'admin' && (
            <Card className="max-w-lg space-y-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Invite Team Member</h3>
              <form onSubmit={handleSubmit(onInvite)} className="space-y-3">
                <Input label="Email" type="email" fullWidth {...register('email')} />
                <Input label="Full Name" fullWidth {...register('fullName')} />
                <Select label="Role" options={[
                  { value: 'project_manager', label: 'Project Manager' },
                  { value: 'analyst', label: 'Analyst' },
                  { value: 'viewer', label: 'Viewer' },
                ]} fullWidth {...register('role')} />
                <Button type="submit">Send Invite</Button>
              </form>
            </Card>
          )}
          <Table
            columns={[
              { key: 'full_name', header: 'Name', render: (r: any) => r.full_name || '—' },
              { key: 'email', header: 'Email' },
              { key: 'role', header: 'Role', render: (r: any) => <Badge size="sm" variant="brand" className="capitalize">{r.role}</Badge> },
              { key: 'is_active', header: 'Status', render: (r: any) => <Badge size="sm" variant={r.is_active ? 'success' : 'default'} dot>{r.is_active ? 'Active' : 'Inactive'}</Badge> },
            ]}
            data={users}
            loading={loadingUsers}
            emptyText="No users"
          />
        </div>
      )}

      {tab === 'yardi' && (
        <Card className="max-w-lg space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Yardi Integration</h3>
          <p className="text-sm text-[var(--text-secondary)]">BidIQ connects to Yardi via one-way CSV import only. Navigate to Yardi Import to upload files.</p>
          <div className="rounded-lg border border-[var(--border-default)] p-3 bg-[var(--bg-elevated)] space-y-1 text-sm">
            <p className="font-medium text-[var(--text-primary)]">Sync Mode</p>
            <p className="text-[var(--text-secondary)]">Manual CSV upload (no write-back to Yardi)</p>
          </div>
        </Card>
      )}
    </PageWrapper>
  );
}
