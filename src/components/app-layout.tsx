// PT AOMA Prima Medika - Main Application Layout
// Includes: Sidebar Navigation, Topbar, Theme Toggle, Breadcrumbs

'use client';

import { useState } from 'react';
import {
  Package,
  Users,
  FileText,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Building2,
  UserCircle,
  Warehouse,
} from 'lucide-react';
import { Button } from './ui/button';
import { useTheme } from './theme-provider';
// Ganti import figma dengan file lokal:
import aomaLogo from '../components/aoma.png'; // Sesuaikan nama file Anda

interface AppLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate?: (page: string) => void;
}

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  active?: boolean;
  badge?: string;
}

export function AppLayout({ children, currentPage, onNavigate }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const navItems: NavItem[] = [
    {
      label: 'Dashboard Gudang',
      icon: <Warehouse className="size-5" />,
      href: 'gudang',
      active: currentPage === 'gudang',
    },
    {
      label: 'Admin Sales',
      icon: <FileText className="size-5" />,
      href: 'admin-sales',
      active: currentPage === 'admin-sales',
    },
    {
      label: 'Master Produk',
      icon: <Package className="size-5" />,
      href: 'master-products',
      active: currentPage === 'master-products',
    },
    {
      label: 'Master Customer',
      icon: <Building2 className="size-5" />,
      href: 'master-customers',
      active: currentPage === 'master-customers',
    },
    {
      label: 'Master Sales',
      icon: <Users className="size-5" />,
      href: 'master-sales',
      active: currentPage === 'master-sales',
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 shadow-sm ${
          sidebarCollapsed ? 'w-16' : 'w-72'
        }`}
      >
        {/* Logo Header */}
        <div className="flex h-20 items-center justify-between border-b border-sidebar-border px-5">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-4">
              <img 
                src={aomaLogo} 
                alt="AOMA Logo" 
                className="h-12 w-12 object-contain flex-shrink-0"
              />
              <div>
                <h1 className="text-base font-bold leading-tight">PT AOMA</h1>
                <p className="text-xs text-sidebar-foreground/70 leading-tight">Prima Medika</p>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <img 
              src={aomaLogo} 
              alt="AOMA Logo" 
              className="h-10 w-10 object-contain mx-auto"
            />
          )}
          {!sidebarCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-sidebar-foreground hover:bg-sidebar-accent flex-shrink-0"
            >
              <ChevronLeft className="size-4" />
            </Button>
          )}
          {sidebarCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-sidebar-foreground hover:bg-sidebar-accent w-full"
            >
              <ChevronRight className="size-4" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item, index) => (
            <button
              key={index}
              onClick={() => onNavigate?.(item.href)}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                item.active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              {item.icon}
              {!sidebarCollapsed && <span>{item.label}</span>}
              {!sidebarCollapsed && item.badge && (
                <span className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-xs text-destructive-foreground">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 bg-sidebar-accent/50">
            <UserCircle className="size-5 text-sidebar-foreground flex-shrink-0" />
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">Admin User</p>
                <p className="text-xs text-sidebar-foreground/70 truncate">admin@aoma.co.id</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="premium-card z-10 flex h-16 items-center justify-between rounded-none border-x-0 border-t-0 px-6">
          <div className="flex items-center gap-3">
            <img 
              src={aomaLogo} 
              alt="AOMA Logo" 
              className="size-8 object-contain"
            />
            <div>
              <h2 className="text-xl font-semibold text-card-foreground">
                {navItems.find((item) => item.active)?.label || 'Dashboard'}
              </h2>
              <p className="text-sm text-muted-foreground">
                Sistem Manajemen Distribusi Farmasi & Alat Kesehatan
              </p>
            </div>
          </div>

          {/* Theme Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className="size-9"
          >
            {theme === 'light' ? (
              <Moon className="size-4" />
            ) : (
              <Sun className="size-4" />
            )}
          </Button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-transparent p-6">
          {children}
        </main>
      </div>
    </div>
  );
}