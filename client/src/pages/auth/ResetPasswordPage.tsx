import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import SplitLayout from '@/components/layout/SplitLayout';

const schema = z.object({
  password: z.string().min(8, 'At least 8 characters'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    // Supabase processes the hash token automatically; we just wait for a session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    // If session already exists (e.g. already processed), allow the form
    if (session) setReady(true);
    return () => subscription.unsubscribe();
  }, [session]);

  const onSubmit = async ({ password }: FormData) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password updated — please sign in');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SplitLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-heading font-bold text-[var(--text-primary)]">Set new password</h1>
          <p className="text-sm text-[var(--text-secondary)]">Choose a strong password for your account.</p>
        </div>

        {!ready ? (
          <p className="text-sm text-[var(--text-secondary)]">Verifying reset link…</p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-card">
            <Input
              label="New password"
              type="password"
              iconLeft={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              fullWidth
              {...register('password')}
            />
            <Input
              label="Confirm password"
              type="password"
              iconLeft={<Lock className="w-4 h-4" />}
              error={errors.confirm?.message}
              fullWidth
              {...register('confirm')}
            />
            <Button type="submit" loading={loading} fullWidth>Update password</Button>
          </form>
        )}
      </div>
    </SplitLayout>
  );
}
