// PT AOMA Prima Medika - Main Application Entry Point
// Sistem Manajemen Distribusi Farmasi & Alat Kesehatan

'use client';

import { useState, useEffect } from 'react';
import { ThemeProvider } from './components/theme-provider';
import { AppLayout } from './components/app-layout';
import { DashboardGudang } from './components/dashboard-gudang-complete';
import { AdminSalesPage } from './components/admin-sales-page-enhanced';
import { MasterProductsPage } from './components/master-products-page';
import { MasterCustomersPage } from './components/master-customers-page';
import { MasterSalesPage } from './components/master-sales-page';
import { SetupInstructions } from './components/setup-instructions';
import { Toaster } from './components/ui/sonner';
import { supabase } from './utils/supabase/client';

type PageType = 'gudang' | 'admin-sales' | 'master-products' | 'master-customers' | 'master-sales';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('gudang');
  const [showSetupInstructions, setShowSetupInstructions] = useState(false);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);

  // Check if database is setup on mount
  useEffect(() => {
    checkDatabaseSetup();
  }, []);

  async function checkDatabaseSetup() {
    try {
      // Try to fetch products to check if database is setup
      const { data, error } = await supabase.from('products').select('id').limit(1);
      
      if (error) {
        // If error, assume database is not setup
        console.log('Database not setup yet:', error.message);
        setShowSetupInstructions(true);
      } else if (!data || data.length === 0) {
        // If no data exists, show setup instructions
        setShowSetupInstructions(true);
      }
    } catch (error) {
      console.error('Error checking database setup:', error);
      setShowSetupInstructions(true);
    } finally {
      setIsCheckingSetup(false);
    }
  }

  function renderPage() {
    switch (currentPage) {
      case 'gudang':
        return <DashboardGudang />;
      case 'admin-sales':
        return <AdminSalesPage />;
      case 'master-products':
        return <MasterProductsPage />;
      case 'master-customers':
        return <MasterCustomersPage />;
      case 'master-sales':
        return <MasterSalesPage />;
      default:
        return <DashboardGudang />;
    }
  }

  return (
    <ThemeProvider>
      <div className="aoma-app-shell min-h-screen">
        <AppLayout currentPage={currentPage} onNavigate={(page) => setCurrentPage(page as PageType)}>
          {isCheckingSetup ? (
            <div className="flex h-96 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 size-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <h2 className="text-2xl font-bold">Memuat Aplikasi...</h2>
                <p className="text-muted-foreground">Memeriksa koneksi database...</p>
              </div>
            </div>
          ) : (
            renderPage()
          )}
        </AppLayout>
        
        {/* Setup Instructions Modal */}
        {showSetupInstructions && (
          <SetupInstructions onClose={() => setShowSetupInstructions(false)} />
        )}
        
        <Toaster position="top-right" richColors />
      </div>
    </ThemeProvider>
  );
}