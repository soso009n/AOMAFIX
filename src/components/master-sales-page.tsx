// PT AOMA Prima Medika - Master Sales Teams Page with FULL CRUD
// Features: CREATE, READ, UPDATE, DELETE Sales Teams

'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, MapPin, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { DataTable } from './data-table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import type { SalesTeam, SalesTeamInsert } from '../utils/supabase/types';
import { exportToExcel } from '../utils/excel-export';

interface SalesFormData {
  nama_sales: string;
  cabang: string;
}

export function MasterSalesPage() {
  const [salesTeams, setSalesTeams] = useState<SalesTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSales, setSelectedSales] = useState<SalesTeam | null>(null);

  // Form data for CREATE
  const [createForm, setCreateForm] = useState<SalesFormData>({
    nama_sales: '',
    cabang: '',
  });

  // Form data for EDIT
  const [editForm, setEditForm] = useState<SalesFormData>({
    nama_sales: '',
    cabang: '',
  });

  useEffect(() => {
    loadSalesTeams();
  }, []);

  async function loadSalesTeams() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sales_teams')
        .select('*')
        .order('cabang')
        .order('nama_sales');

      if (error) throw error;

      setSalesTeams(data || []);
    } catch (error: any) {
      toast.error('Error loading sales teams: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }

  // ============================================
  // CREATE SALES TEAM
  // ============================================
  async function handleCreateSales(e: React.FormEvent) {
    e.preventDefault();

    try {
      const newSales: SalesTeamInsert = {
        nama_sales: createForm.nama_sales,
        cabang: createForm.cabang,
      };

      const { error } = await supabase
        .from('sales_teams')
        .insert(newSales);

      if (error) throw error;

      toast.success('✅ Sales team berhasil ditambahkan!');
      setIsCreateModalOpen(false);
      resetCreateForm();
      loadSalesTeams();
    } catch (error: any) {
      toast.error('Error creating sales team: ' + error.message);
    }
  }

  // ============================================
  // EDIT SALES TEAM
  // ============================================
  function openEditModal(sales: SalesTeam) {
    setSelectedSales(sales);
    setEditForm({
      nama_sales: sales.nama_sales,
      cabang: sales.cabang,
    });
    setIsEditModalOpen(true);
  }

  async function handleEditSales(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedSales) return;

    try {
      const { error } = await supabase
        .from('sales_teams')
        .update({
          nama_sales: editForm.nama_sales,
          cabang: editForm.cabang,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedSales.id);

      if (error) throw error;

      toast.success('✅ Sales team berhasil diupdate!');
      setIsEditModalOpen(false);
      setSelectedSales(null);
      loadSalesTeams();
    } catch (error: any) {
      toast.error('Error updating sales team: ' + error.message);
    }
  }

  // ============================================
  // DELETE SALES TEAM
  // ============================================
  function openDeleteDialog(sales: SalesTeam) {
    setSelectedSales(sales);
    setIsDeleteDialogOpen(true);
  }

  async function handleDeleteSales() {
    if (!selectedSales) return;

    try {
      // Check if sales team has transactions (foreign key constraint)
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id')
        .eq('sales_id', selectedSales.id)
        .limit(1);

      if (transactions && transactions.length > 0) {
        toast.error(
          '❌ Sales team tidak dapat dihapus karena memiliki riwayat transaksi! Gunakan soft delete atau archive jika diperlukan.',
          { duration: 5000 }
        );
        setIsDeleteDialogOpen(false);
        setSelectedSales(null);
        return;
      }

      const { error } = await supabase
        .from('sales_teams')
        .delete()
        .eq('id', selectedSales.id);

      if (error) {
        if (error.code === '23503') {
          toast.error(
            '❌ Sales team memiliki relasi dengan data lain dan tidak dapat dihapus!'
          );
          return;
        }
        throw error;
      }

      toast.success('✅ Sales team berhasil dihapus!');
      setIsDeleteDialogOpen(false);
      setSelectedSales(null);
      loadSalesTeams();
    } catch (error: any) {
      toast.error('Error deleting sales team: ' + error.message);
    }
  }

  // ============================================
  // RESET FORMS
  // ============================================
  function resetCreateForm() {
    setCreateForm({
      nama_sales: '',
      cabang: '',
    });
  }

  // ============================================
  // STATISTICS
  // ============================================
  const totalSales = salesTeams.length;
  const uniqueBranches = [...new Set(salesTeams.map((s) => s.cabang))].length;
  const branchDistribution = salesTeams.reduce(
    (acc, sales) => {
      acc[sales.cabang] = (acc[sales.cabang] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const topBranch = Object.entries(branchDistribution).sort(
    (a, b) => b[1] - a[1]
  )[0];

  // ============================================
  // TABLE DATA PREPARATION
  // ============================================
  const tableData = salesTeams.map((sales) => ({
    id: sales.id,
    nama_sales: sales.nama_sales,
    cabang: sales.cabang,
    created_at: new Date(sales.created_at).toLocaleDateString('id-ID'),
    _raw: sales, // Store raw data for actions
  }));

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales Team</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSales}</div>
            <p className="text-xs text-muted-foreground">Sales terdaftar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cabang</CardTitle>
            <MapPin className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueBranches}</div>
            <p className="text-xs text-muted-foreground">Cabang aktif</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cabang Terbesar</CardTitle>
            <TrendingUp className="size-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {topBranch ? topBranch[0] : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {topBranch ? `${topBranch[1]} sales` : 'No data'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Master Data Sales Team</CardTitle>
            <CardDescription>
              Manajemen data tim penjualan per cabang
            </CardDescription>
          </div>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="size-4" />
                Tambah Sales Team
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Tambah Sales Team Baru</DialogTitle>
                <DialogDescription>
                  Isi data sales team baru. Semua field wajib diisi.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSales} className="space-y-4">
                <div className="space-y-2">
                  <Label>
                    Nama Sales <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={createForm.nama_sales}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, nama_sales: e.target.value })
                    }
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Cabang <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={createForm.cabang}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, cabang: e.target.value })
                    }
                    placeholder="Jakarta Pusat / Surabaya / Bandung"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Nama cabang tempat sales bekerja
                  </p>
                </div>

                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button type="submit">Simpan Sales Team</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <DataTable
            data={tableData}
            columns={[
              { key: 'nama_sales', label: 'Nama Sales', sortable: true },
              {
                key: 'cabang',
                label: 'Cabang',
                sortable: true,
                render: (row) => (
                  <Badge variant="outline" className="font-medium">
                    <MapPin className="size-3 mr-1" />
                    {row.cabang}
                  </Badge>
                ),
              },
              { key: 'created_at', label: 'Terdaftar Sejak', sortable: true },
              {
                key: 'actions',
                label: 'Aksi',
                render: (row: any) => (
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={() => openEditModal(row._raw)}
                    >
                      <Edit2 className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={() => openDeleteDialog(row._raw)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                ),
              },
            ]}
            searchable
            exportable
            onExport={() =>
              exportToExcel(tableData, { filename: 'Master_Sales_Teams.xlsx' })
            }
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Branch Distribution Card */}
      <Card>
        <CardHeader>
          <CardTitle>Distribusi Sales per Cabang</CardTitle>
          <CardDescription>
            Jumlah sales team di setiap cabang
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(branchDistribution)
              .sort((a, b) => b[1] - a[1])
              .map(([branch, count]) => (
                <div
                  key={branch}
                  className="flex flex-col items-center p-4 border rounded-lg"
                >
                  <MapPin className="size-6 text-primary mb-2" />
                  <div className="text-xl font-bold">{count}</div>
                  <div className="text-sm text-muted-foreground text-center">
                    {branch}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* EDIT MODAL */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Sales Team</DialogTitle>
            <DialogDescription>
              Perbarui data sales team. Semua field wajib diisi.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSales} className="space-y-4">
            <div className="space-y-2">
              <Label>
                Nama Sales <span className="text-destructive">*</span>
              </Label>
              <Input
                value={editForm.nama_sales}
                onChange={(e) =>
                  setEditForm({ ...editForm, nama_sales: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label>
                Cabang <span className="text-destructive">*</span>
              </Label>
              <Input
                value={editForm.cabang}
                onChange={(e) =>
                  setEditForm({ ...editForm, cabang: e.target.value })
                }
                required
              />
              <p className="text-xs text-muted-foreground">
                Nama cabang tempat sales bekerja
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit">Update Sales Team</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Sales Team</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus sales team ini?
              <br />
              <br />
              <strong>Nama Sales:</strong> {selectedSales?.nama_sales}
              <br />
              <strong>Cabang:</strong> {selectedSales?.cabang}
              <br />
              <br />
              ⚠️ <strong>PERHATIAN:</strong> Jika sales team memiliki riwayat
              transaksi, data tidak dapat dihapus karena referential integrity.
              Aksi ini tidak dapat dibatalkan!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSales}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Hapus Sales Team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
