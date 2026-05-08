'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutList, LogOut } from 'lucide-react';

const navItems = [{ href: '/applications', label: 'Applications', icon: LayoutList }];

export function CrmShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-outline-variant/20 bg-surface-container-lowest lg:flex">
        <div className="px-5 pb-4 pt-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
            Admin Portal
          </p>
          <p className="mt-1 font-display text-lg font-semibold text-primary">Shield Plus CRM</p>
        </div>

        <nav className="flex-1 px-3">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  active
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:bg-primary-fixed/40 hover:text-primary'
                }`}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-outline-variant/20 px-3 py-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-on-surface-variant transition hover:bg-primary-fixed/40 hover:text-primary"
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-outline-variant/20 bg-surface-container-lowest px-4 py-3 lg:hidden">
          <p className="font-display text-lg font-semibold text-primary">Shield Plus CRM</p>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-on-surface-variant hover:bg-primary-fixed/40"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
