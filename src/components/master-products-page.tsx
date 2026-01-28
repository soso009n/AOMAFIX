// PT AOMA Prima Medika - Master Data Products Page
// CRUD operations for products management

'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Package } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { DataTable } from './data-table';
import { toast } from 'sonner';
import { supabase, formatCurrency } from '../utils/supabase/client';
import type { Product, ProductInsert } from '../utils/supabase/types';
import { exportToExcel } from '../utils/excel-export';

export function MasterProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [formData, setFormData] = useState({
    nama_produk: '',
    kode_produk: '',
    nama_pabrik: '',
    hpp: '',
    hna: '',
  });

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('nama_produk');

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast.error('Error loading products: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const productData: ProductInsert = {
      nama_produk: formData.nama_produk,
      kode_produk: formData.kode_produk,
      nama_pabrik: formData.nama_pabrik,
      hpp: parseFloat(formData.hpp),
      hna: parseFloat(formData.hna),
    };

    try {
      if (editingProduct) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast.success('Produk berhasil diupdate!');
      } else {
        // Create new product
        const { error } = await supabase.from('products').insert(productData);

        if (error) throw error;
        toast.success('Produk berhasil ditambahkan!');
      }

      setIsModalOpen(false);
      resetForm();
      loadProducts();
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return;

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);

      if (error) throw error;
      toast.success('Produk berhasil dihapus!');
      loadProducts();
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);
    setFormData({
      nama_produk: product.nama_produk,
      kode_produk: product.kode_produk,
      nama_pabrik: product.nama_pabrik,
      hpp: product.hpp.toString(),
      hna: product.hna.toString(),
    });
    setIsModalOpen(true);
  }

  function resetForm() {
    setEditingProduct(null);
    setFormData({
      nama_produk: '',
      kode_produk: '',
      nama_pabrik: '',
      hpp: '',
      hna: '',
    });
  }

  const totalProducts = products.length;
  const totalStockValue = products.reduce((sum, p) => sum + p.current_stock * p.hpp, 0);

  // Prepare data for table
  const tableData = products.map((p) => ({
    ...p,
    hpp_formatted: formatCurrency(p.hpp),
    hna_formatted: formatCurrency(p.hna),
    stock_value: formatCurrency(p.current_stock * p.hpp),
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Produk</CardTitle>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">Produk terdaftar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nilai Total Stok</CardTitle>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalStockValue)}</div>
            <p className="text-xs text-muted-foreground">Berdasarkan HPP</p>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Master Data Produk</CardTitle>
            <CardDescription>
              Kelola data produk farmasi dan alat kesehatan
            </CardDescription>
          </div>
          <Dialog open={isModalOpen} onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="size-4" />
                Tambah Produk
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
                </DialogTitle>
                <DialogDescription>
                  {editingProduct ? 'Perbarui detail produk' : 'Masukkan detail produk baru'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nama Produk *</Label>
                    <Input
                      value={formData.nama_produk}
                      onChange={(e) =>
                        setFormData({ ...formData, nama_produk: e.target.value })
                      }
                      placeholder="Contoh: Paracetamol 500mg"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Kode Produk *</Label>
                    <Input
                      value={formData.kode_produk}
                      onChange={(e) =>
                        setFormData({ ...formData, kode_produk: e.target.value })
                      }
                      placeholder="Contoh: MED-001"
                      required
                      disabled={!!editingProduct} // Kode tidak bisa diubah saat edit
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Nama Pabrik *</Label>
                    <Input
                      value={formData.nama_pabrik}
                      onChange={(e) =>
                        setFormData({ ...formData, nama_pabrik: e.target.value })
                      }
                      placeholder="Contoh: Kalbe Farma"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>HPP (Harga Pokok) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.hpp}
                      onChange={(e) =>
                        setFormData({ ...formData, hpp: e.target.value })
                      }
                      placeholder="50000"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Harga beli dari pabrik (COGS)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>HNA (Harga Netto Apotek) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.hna}
                      onChange={(e) =>
                        setFormData({ ...formData, hna: e.target.value })
                      }
                      placeholder="75000"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Harga jual ke RS/Outlet (sebelum diskon)
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsModalOpen(false);
                      resetForm();
                    }}
                  >
                    Batal
                  </Button>
                  <Button type="submit">
                    {editingProduct ? 'Update' : 'Simpan'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <DataTable
            data={tableData}
            columns={[
              { key: 'kode_produk', label: 'Kode', sortable: true },
              { key: 'nama_produk', label: 'Nama Produk', sortable: true },
              { key: 'nama_pabrik', label: 'Pabrik', sortable: true },
              { key: 'hpp_formatted', label: 'HPP', sortable: true },
              { key: 'hna_formatted', label: 'HNA', sortable: true },
              { key: 'current_stock', label: 'Stok', sortable: true },
              { key: 'stock_value', label: 'Nilai Stok', sortable: true },
              {
                key: 'actions',
                label: 'Aksi',
                render: (row: any) => (
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(row);
                      }}
                      title="Edit Produk"
                    >
                      <Edit2 className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(row.id);
                      }}
                      className="hover:bg-destructive/10"
                      title="Hapus Produk"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                ),
              },
            ]}
            searchable
            exportable
            onExport={() => {
              const exportData = products.map((p) => ({
                'Kode Produk': p.kode_produk,
                'Nama Produk': p.nama_produk,
                'Nama Pabrik': p.nama_pabrik,
                'HPP': p.hpp,
                'HNA': p.hna,
                'Stok Saat Ini': p.current_stock,
                'Nilai Stok (HPP)': p.current_stock * p.hpp,
              }));
              exportToExcel(exportData, { filename: 'Master_Produk.xlsx' });
            }}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}