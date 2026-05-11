import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/services/supabase';
import Spinner from '@/components/ui/Spinner';

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/dashboard', { replace: true });
      } else if (event === 'PASSWORD_RECOVERY') {
        navigate('/auth/reset-password', { replace: true });
      }
    });

    // Handle case where Supabase already processed the token before this mounts
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard', { replace: true });
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--bg-base)] flex-col gap-4">
      <Spinner size="lg" />
      <p className="text-sm text-[var(--text-secondary)]">Signing you in…</p>
    </div>
  );
}
