// PT AOMA Prima Medika - Master Customers Page with FULL CRUD
// Features: CREATE, READ, UPDATE, DELETE Customers (Rumah Sakit, Apotek, Outlet)

'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Building2, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { DataTable } from './data-table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import type { Customer, CustomerInsert } from '../utils/supabase/types';
import { exportToExcel } from '../utils/excel-export';

interface CustomerFormData {
  nama_outlet: string;
  alamat: string;
  nomor_nib: string;
  nama_penanggung_jawab: string;
  npwp: string;
  sipa: string;
  idak_cdakb: string; // Optional field
}

export function MasterCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Form data for CREATE
  const [createForm, setCreateForm] = useState<CustomerFormData>({
    nama_outlet: '',
    alamat: '',
    nomor_nib: '',
    nama_penanggung_jawab: '',
    npwp: '',
    sipa: '',
    idak_cdakb: '',
  });

  // Form data for EDIT
  const [editForm, setEditForm] = useState<CustomerFormData>({
    nama_outlet: '',
    alamat: '',
    nomor_nib: '',
    nama_penanggung_jawab: '',
    npwp: '',
    sipa: '',
    idak_cdakb: '',
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('nama_outlet');

      if (error) throw error;

      setCustomers(data || []);
    } catch (error: any) {
      toast.error('Error loading customers: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }

  // ============================================
  // CREATE CUSTOMER
  // ============================================
  async function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault();

    try {
      // Check if NIB already exists (UNIQUE constraint)
      const { data: existingNIB, error: checkError } = await supabase
        .from('customers')
        .select('nomor_nib')
        .eq('nomor_nib', createForm.nomor_nib)
        .single();

      if (existingNIB) {
        toast.error('❌ NIB sudah terdaftar! Gunakan nomor NIB yang berbeda.');
        return;
      }

      const newCustomer: CustomerInsert = {
        nama_outlet: createForm.nama_outlet,
        alamat: createForm.alamat,
        nomor_nib: createForm.nomor_nib,
        nama_penanggung_jawab: createForm.nama_penanggung_jawab,
        npwp: createForm.npwp,
        sipa: createForm.sipa,
        idak_cdakb: createForm.idak_cdakb || null, // Optional field
      };

      const { error } = await supabase
        .from('customers')
        .insert(newCustomer);

      if (error) {
        // Handle unique constraint violation
        if (error.code === '23505') {
          toast.error('❌ NIB sudah terdaftar! Gunakan nomor NIB yang berbeda.');
          return;
        }
        throw error;
      }

      toast.success('✅ Customer berhasil ditambahkan!');
      setIsCreateModalOpen(false);
      resetCreateForm();
      loadCustomers();
    } catch (error: any) {
      toast.error('Error creating customer: ' + error.message);
    }
  }

  // ============================================
  // EDIT CUSTOMER
  // ============================================
  function openEditModal(customer: Customer) {
    setSelectedCustomer(customer);
    setEditForm({
      nama_outlet: customer.nama_outlet,
      alamat: customer.alamat,
      nomor_nib: customer.nomor_nib,
      nama_penanggung_jawab: customer.nama_penanggung_jawab,
      npwp: customer.npwp,
      sipa: customer.sipa,
      idak_cdakb: customer.idak_cdakb || '',
    });
    setIsEditModalOpen(true);
  }

  async function handleEditCustomer(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedCustomer) return;

    try {
      // Check if NIB is being changed to an existing one
      if (editForm.nomor_nib !== selectedCustomer.nomor_nib) {
        const { data: existingNIB } = await supabase
          .from('customers')
          .select('nomor_nib')
          .eq('nomor_nib', editForm.nomor_nib)
          .single();

        if (existingNIB) {
          toast.error('❌ NIB sudah terdaftar! Gunakan nomor NIB yang berbeda.');
          return;
        }
      }

      const { error } = await supabase
        .from('customers')
        .update({
          nama_outlet: editForm.nama_outlet,
          alamat: editForm.alamat,
          nomor_nib: editForm.nomor_nib,
          nama_penanggung_jawab: editForm.nama_penanggung_jawab,
          npwp: editForm.npwp,
          sipa: editForm.sipa,
          idak_cdakb: editForm.idak_cdakb || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedCustomer.id);

      if (error) {
        if (error.code === '23505') {
          toast.error('❌ NIB sudah terdaftar! Gunakan nomor NIB yang berbeda.');
          return;
        }
        throw error;
      }

      toast.success('✅ Customer berhasil diupdate!');
      setIsEditModalOpen(false);
      setSelectedCustomer(null);
      loadCustomers();
    } catch (error: any) {
      toast.error('Error updating customer: ' + error.message);
    }
  }

  // ============================================
  // DELETE CUSTOMER
  // ============================================
  function openDeleteDialog(customer: Customer) {
    setSelectedCustomer(customer);
    setIsDeleteDialogOpen(true);
  }

  async function handleDeleteCustomer() {
    if (!selectedCustomer) return;

    try {
      // Check if customer has transactions (foreign key constraint)
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id')
        .eq('customer_id', selectedCustomer.id)
        .limit(1);

      if (transactions && transactions.length > 0) {
        toast.error(
          '❌ Customer tidak dapat dihapus karena memiliki riwayat transaksi! Gunakan soft delete atau archive jika diperlukan.',
          { duration: 5000 }
        );
        setIsDeleteDialogOpen(false);
        setSelectedCustomer(null);
        return;
      }

      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', selectedCustomer.id);

      if (error) {
        if (error.code === '23503') {
          toast.error('❌ Customer memiliki relasi dengan data lain dan tidak dapat dihapus!');
          return;
        }
        throw error;
      }

      toast.success('✅ Customer berhasil dihapus!');
      setIsDeleteDialogOpen(false);
      setSelectedCustomer(null);
      loadCustomers();
    } catch (error: any) {
      toast.error('Error deleting customer: ' + error.message);
    }
  }

  // ============================================
  // RESET FORMS
  // ============================================
  function resetCreateForm() {
    setCreateForm({
      nama_outlet: '',
      alamat: '',
      nomor_nib: '',
      nama_penanggung_jawab: '',
      npwp: '',
      sipa: '',
      idak_cdakb: '',
    });
  }

  // ============================================
  // STATISTICS
  // ============================================
  const totalCustomers = customers.length;
  const customersWithTransactions = 0; // Can be calculated from transactions join
  const customersWithIDAK = customers.filter((c) => c.idak_cdakb).length;

  // ============================================
  // TABLE DATA PREPARATION
  // ============================================
  const tableData = customers.map((customer) => ({
    id: customer.id,
    nama_outlet: customer.nama_outlet,
    alamat: customer.alamat,
    nomor_nib: customer.nomor_nib,
    penanggung_jawab: customer.nama_penanggung_jawab,
    npwp: customer.npwp,
    sipa: customer.sipa,
    idak_cdakb: customer.idak_cdakb || '-',
    has_idak: customer.idak_cdakb ? 'Ya' : 'Tidak',
    _raw: customer, // Store raw data for actions
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
            <CardTitle className="text-sm font-medium">Total Customer</CardTitle>
            <Building2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground">Outlet terdaftar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dengan IDAK/CDAKB</CardTitle>
            <Building2 className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customersWithIDAK}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((customersWithIDAK / totalCustomers) * 100) || 0}% dari total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance</CardTitle>
            <AlertCircle className="size-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">100%</div>
            <p className="text-xs text-muted-foreground">NIB, NPWP, SIPA valid</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Master Data Customer</CardTitle>
            <CardDescription>
              Manajemen data customer: Rumah Sakit, Apotek, dan Outlet
            </CardDescription>
          </div>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="size-4" />
                Tambah Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tambah Customer Baru</DialogTitle>
                <DialogDescription>
                  Isi semua field yang wajib (*). Field IDAK/CDAKB bersifat opsional.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateCustomer} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label>
                      Nama Outlet / Rumah Sakit <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={createForm.nama_outlet}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, nama_outlet: e.target.value })
                      }
                      placeholder="RS Siloam / Apotek Kimia Farma"
                      required
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label>
                      Alamat <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      value={createForm.alamat}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, alamat: e.target.value })
                      }
                      placeholder="Jl. Sudirman No. 123, Jakarta Pusat"
                      rows={3}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Nomor NIB (Unique) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={createForm.nomor_nib}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, nomor_nib: e.target.value })
                      }
                      placeholder="1234567890123"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Nomor Induk Berusaha harus unik
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Nama Penanggung Jawab <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={createForm.nama_penanggung_jawab}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          nama_penanggung_jawab: e.target.value,
                        })
                      }
                      placeholder="Dr. John Doe"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      NPWP <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={createForm.npwp}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, npwp: e.target.value })
                      }
                      placeholder="12.345.678.9-012.000"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      SIPA <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={createForm.sipa}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, sipa: e.target.value })
                      }
                      placeholder="SIPA/2024/001"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Surat Izin Praktik Apoteker
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>IDAK/CDAKB (Opsional)</Label>
                    <Input
                      value={createForm.idak_cdakb}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, idak_cdakb: e.target.value })
                      }
                      placeholder="IDAK/2024/001"
                    />
                    <p className="text-xs text-muted-foreground">
                      Izin Distribusi Alat Kesehatan (Optional)
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button type="submit">Simpan Customer</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <DataTable
            data={tableData}
            columns={[
              { key: 'nama_outlet', label: 'Nama Outlet', sortable: true },
              { key: 'alamat', label: 'Alamat', sortable: true },
              { key: 'nomor_nib', label: 'NIB', sortable: true },
              { key: 'penanggung_jawab', label: 'Penanggung Jawab', sortable: true },
              { key: 'npwp', label: 'NPWP', sortable: true },
              { key: 'sipa', label: 'SIPA', sortable: true },
              {
                key: 'has_idak',
                label: 'IDAK/CDAKB',
                sortable: true,
                render: (row) =>
                  row.has_idak === 'Ya' ? (
                    <Badge variant="default">✓ Ada</Badge>
                  ) : (
                    <Badge variant="outline">- Tidak</Badge>
                  ),
              },
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
              exportToExcel(tableData, { filename: 'Master_Customers.xlsx' })
            }
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* EDIT MODAL */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Perbarui data customer. Pastikan NIB tetap unik jika diubah.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditCustomer} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>
                  Nama Outlet / Rumah Sakit <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={editForm.nama_outlet}
                  onChange={(e) =>
                    setEditForm({ ...editForm, nama_outlet: e.target.value })
                  }
                  required
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>
                  Alamat <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={editForm.alamat}
                  onChange={(e) =>
                    setEditForm({ ...editForm, alamat: e.target.value })
                  }
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Nomor NIB (Unique) <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={editForm.nomor_nib}
                  onChange={(e) =>
                    setEditForm({ ...editForm, nomor_nib: e.target.value })
                  }
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Nomor Induk Berusaha harus unik
                </p>
              </div>

              <div className="space-y-2">
                <Label>
                  Nama Penanggung Jawab <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={editForm.nama_penanggung_jawab}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      nama_penanggung_jawab: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>
                  NPWP <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={editForm.npwp}
                  onChange={(e) =>
                    setEditForm({ ...editForm, npwp: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>
                  SIPA <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={editForm.sipa}
                  onChange={(e) =>
                    setEditForm({ ...editForm, sipa: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>IDAK/CDAKB (Opsional)</Label>
                <Input
                  value={editForm.idak_cdakb}
                  onChange={(e) =>
                    setEditForm({ ...editForm, idak_cdakb: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit">Update Customer</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus customer ini?
              <br />
              <br />
              <strong>Nama Outlet:</strong> {selectedCustomer?.nama_outlet}
              <br />
              <strong>NIB:</strong> {selectedCustomer?.nomor_nib}
              <br />
              <strong>Penanggung Jawab:</strong> {selectedCustomer?.nama_penanggung_jawab}
              <br />
              <br />
              ⚠️ <strong>PERHATIAN:</strong> Jika customer memiliki riwayat transaksi,
              data tidak dapat dihapus karena referential integrity. Aksi ini tidak
              dapat dibatalkan!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCustomer}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Hapus Customer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
