'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { LoadingState } from '@/components/LoadingState';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) { router.replace('/login'); return <LoadingState />; }
  if (user && !user.isAdmin) { router.replace('/feed'); return <LoadingState />; }

  const NAV = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: '🔷' },
    { href: '/admin/users', label: 'Users', icon: '👤' },
    { href: '/admin/organizations', label: 'Organizations', icon: '🏢' },
    { href: '/admin/jobs', label: 'Jobs', icon: '💼' },
    { href: '/admin/disputes', label: 'Disputes', icon: '⚠️' },
    { href: '/admin/invoices', label: 'Invoices', icon: '📄' },
    { href: '/admin/reports', label: 'Reports', icon: '📊' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-neutral-200 flex flex-col py-6 px-4 shrink-0 hidden md:flex">
        <div className="text-xl font-extrabold text-[#6c47ff] mb-8 px-2">nabora admin</div>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition text-left"
            >
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 flex md:hidden z-30">
        {NAV.slice(0, 5).map((item) => (
          <button key={item.href} onClick={() => router.push(item.href)}
            className="flex-1 py-3 flex flex-col items-center gap-0.5 text-neutral-500 hover:text-neutral-800 transition">
            <span className="text-base">{item.icon}</span>
            <span className="text-[9px] font-semibold">{item.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      <main className="flex-1 overflow-auto pb-20 md:pb-0">{children}</main>
    </div>
  );
}
