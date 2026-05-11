import { useRef, useState } from 'react';
import { Sun, Moon, Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlobalSearch from '@/components/ui/GlobalSearch';
import NotificationBell from '@/components/ui/NotificationBell';
import { useThemeStore } from '@/store/themeStore';
import { useAuthStore } from '@/store/authStore';
import { useNotifications } from '@/hooks/useNotifications';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';

export default function TopNav() {
  const { theme, toggle } = useThemeStore();
  const { user, signOut } = useAuthStore();
  const { notifications, markRead } = useNotifications();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(menuRef, () => setMenuOpen(false));

  return (
    <header className="h-14 flex items-center gap-4 px-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] flex-shrink-0">
      <div className="flex-1">
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={toggle}
          className="rounded-lg p-2 hover:bg-[var(--bg-elevated)] transition-colors text-[var(--text-secondary)]"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <NotificationBell notifications={notifications} onMarkRead={markRead} />
        <div ref={menuRef} className="relative ml-1">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
          >
            <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center text-xs font-semibold text-white">
              {user?.email?.[0]?.toUpperCase() ?? '?'}
            </div>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-overlay py-1 z-50">
              <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
                <p className="text-xs font-medium text-[var(--text-primary)] truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => { setMenuOpen(false); navigate('/settings'); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
              >
                <Settings className="w-3.5 h-3.5" /> Settings
              </button>
              <button
                onClick={async () => { setMenuOpen(false); await signOut(); navigate('/login'); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
