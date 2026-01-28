// PT AOMA Prima Medika - Dashboard Gudang with FULL CRUD Inventory Logs
// Features: Inventory Level, Incoming Products (CREATE/EDIT/DELETE), Outgoing Products (CREATE/EDIT/DELETE)

'use client';

import { useState, useEffect } from 'react';
import { Package, TrendingUp, TrendingDown, Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { DataTable } from './data-table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { supabase, formatCurrency, formatDate } from '../utils/supabase/client';
import type { Product, InventoryLog, InventoryLogInsert } from '../utils/supabase/types';
import { exportToExcel } from '../utils/excel-export';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { ProductCombobox } from './product-combobox';

export function DashboardGudang() {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [isIncomingModalOpen, setIsIncomingModalOpen] = useState(false);
  const [isOutgoingModalOpen, setIsOutgoingModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Selected log for edit/delete
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Available lots for selected product (for Barang Keluar)
  const [availableLots, setAvailableLots] = useState<Array<{
    batch_lot_number: string;
    expired_date: string;
    available_qty: number;
  }>>([]);

  // Form state for Incoming Products
  const [incomingForm, setIncomingForm] = useState({
    product_id: '',
    qty: '',
    batch_lot_number: '',
    expired_date: '',
    doc_reference: '',
    date_log: new Date().toISOString().split('T')[0],
    branch_location: '',
  });

  // Form state for Outgoing Products
  const [outgoingForm, setOutgoingForm] = useState({
    product_id: '',
    qty: '',
    batch_lot_number: '',
    expired_date: '',
    doc_reference: '',
    date_log: new Date().toISOString().split('T')[0],
    branch_location: '',
  });

  // Form state for Edit (used for both incoming and outgoing)
  const [editForm, setEditForm] = useState({
    id: '',
    type: 'IN' as 'IN' | 'OUT',
    product_id: '',
    qty: '',
    batch_lot_number: '',
    expired_date: '',
    doc_reference: '',
    date_log: '',
    branch_location: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('nama_produk');

      if (productsError) throw productsError;
      setProducts(productsData || []);

      const { data: logsData, error: logsError } = await supabase
        .from('inventory_logs')
        .select('*, products(*)')
        .order('date_log', { ascending: false })
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;
      setInventoryLogs(logsData || []);
    } catch (error: any) {
      toast.error('Error loading data: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }

  // CREATE Incoming
  async function handleIncomingSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newLog: InventoryLogInsert = {
      type: 'IN',
      product_id: incomingForm.product_id,
      qty: parseInt(incomingForm.qty),
      batch_lot_number: incomingForm.batch_lot_number,
      expired_date: incomingForm.expired_date,
      doc_reference: incomingForm.doc_reference,
      date_log: incomingForm.date_log,
      branch_location: incomingForm.branch_location,
    };

    try {
      const { error } = await supabase.from('inventory_logs').insert(newLog);
      if (error) throw error;
      toast.success('✅ Barang masuk berhasil dicatat!');
      setIsIncomingModalOpen(false);
      resetIncomingForm();
      loadData();
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  }

  // CREATE Outgoing
  async function handleOutgoingSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newLog: InventoryLogInsert = {
      type: 'OUT',
      product_id: outgoingForm.product_id,
      qty: parseInt(outgoingForm.qty),
      batch_lot_number: outgoingForm.batch_lot_number,
      expired_date: outgoingForm.expired_date,
      doc_reference: outgoingForm.doc_reference,
      date_log: outgoingForm.date_log,
      branch_location: outgoingForm.branch_location,
    };

    try {
      const { error } = await supabase.from('inventory_logs').insert(newLog);
      if (error) throw error;
      toast.success('✅ Barang keluar berhasil dicatat!');
      setIsOutgoingModalOpen(false);
      resetOutgoingForm();
      loadData();
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    }
  }

  // UPDATE (Edit)
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('inventory_logs')
        .update({
          product_id: editForm.product_id,
          qty: parseInt(editForm.qty),
          batch_lot_number: editForm.batch_lot_number,
          expired_date: editForm.expired_date,
          doc_reference: editForm.doc_reference,
          date_log: editForm.date_log,
          branch_location: editForm.branch_location,
        })
        .eq('id', editForm.id);

      if (error) throw error;
      toast.success('✅ Data berhasil diperbarui!');
      setIsEditModalOpen(false);
      setSelectedLog(null);
      loadData();
    } catch (error: any) {
      toast.error('Error updating: ' + error.message);
    }
  }

  // DELETE
  async function handleDelete() {
    if (!selectedLog) return;
    
    try {
      const { error } = await supabase
        .from('inventory_logs')
        .delete()
        .eq('id', selectedLog.id);

      if (error) throw error;
      toast.success('✅ Data berhasil dihapus!');
      setIsDeleteDialogOpen(false);
      setSelectedLog(null);
      loadData();
    } catch (error: any) {
      toast.error('Error deleting: ' + error.message);
    }
  }

  // Open Edit Modal
  function openEditModal(log: any) {
    setEditForm({
      id: log.id,
      type: log.type,
      product_id: log.product_id,
      qty: log.qty.toString(),
      batch_lot_number: log.batch_lot_number,
      expired_date: log.expired_date,
      doc_reference: log.doc_reference,
      date_log: log.date_log,
      branch_location: log.branch_location,
    });
    setSelectedLog(log);
    setIsEditModalOpen(true);
  }

  // Open Delete Dialog
  function openDeleteDialog(log: any) {
    setSelectedLog(log);
    setIsDeleteDialogOpen(true);
  }

  // Reset Forms
  function resetIncomingForm() {
    setIncomingForm({
      product_id: '',
      qty: '',
      batch_lot_number: '',
      expired_date: '',
      doc_reference: '',
      date_log: new Date().toISOString().split('T')[0],
      branch_location: '',
    });
  }

  function resetOutgoingForm() {
    setOutgoingForm({
      product_id: '',
      qty: '',
      batch_lot_number: '',
      expired_date: '',
      doc_reference: '',
      date_log: new Date().toISOString().split('T')[0],
      branch_location: '',
    });
    setAvailableLots([]);
  }

  // ============================================
  // FETCH AVAILABLE LOTS (FEFO Logic)
  // ============================================
  async function fetchAvailableLotsForProduct(productId: string) {
    if (!productId) {
      setAvailableLots([]);
      return;
    }

    try {
      // Fetch all inventory logs for this product
      const { data, error } = await supabase
        .from('inventory_logs')
        .select('*')
        .eq('product_id', productId)
        .order('expired_date', { ascending: true }); // FEFO: First Expired First Out

      if (error) throw error;

      // Calculate available qty per lot (IN - OUT)
      const lotMap = new Map<string, { batch_lot_number: string; expired_date: string; in_qty: number; out_qty: number }>();

      (data || []).forEach((log: any) => {
        const key = `${log.batch_lot_number}___${log.expired_date}`;
        
        if (!lotMap.has(key)) {
          lotMap.set(key, {
            batch_lot_number: log.batch_lot_number,
            expired_date: log.expired_date,
            in_qty: 0,
            out_qty: 0,
          });
        }

        const lot = lotMap.get(key)!;
        if (log.type === 'IN') {
          lot.in_qty += log.qty;
        } else {
          lot.out_qty += log.qty;
        }
      });

      // Filter only lots with available stock (IN > OUT)
      const availableLotsArray = Array.from(lotMap.values())
        .map((lot) => ({
          batch_lot_number: lot.batch_lot_number,
          expired_date: lot.expired_date,
          available_qty: lot.in_qty - lot.out_qty,
        }))
        .filter((lot) => lot.available_qty > 0)
        .sort((a, b) => new Date(a.expired_date).getTime() - new Date(b.expired_date).getTime()); // FEFO

      setAvailableLots(availableLotsArray);

      // Auto-select first lot (FEFO)
      if (availableLotsArray.length > 0) {
        const firstLot = availableLotsArray[0];
        setOutgoingForm({
          ...outgoingForm,
          product_id: productId,
          batch_lot_number: firstLot.batch_lot_number,
          expired_date: firstLot.expired_date,
        });
      }
    } catch (error: any) {
      toast.error('Error fetching lots: ' + error.message);
      setAvailableLots([]);
    }
  }

  // Handle lot selection - auto populate expired date
  function handleLotSelection(lotNumber: string) {
    const selectedLot = availableLots.find((lot) => lot.batch_lot_number === lotNumber);
    if (selectedLot) {
      setOutgoingForm({
        ...outgoingForm,
        batch_lot_number: selectedLot.batch_lot_number,
        expired_date: selectedLot.expired_date,
      });
    }
  }

  // Calculate summary
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + p.current_stock, 0);
  const lowStockProducts = products.filter((p) => p.current_stock < 10).length;

  // Table data
  const inventoryData = products.map((p) => ({
    ...p,
    hpp_formatted: formatCurrency(p.hpp),
    hna_formatted: formatCurrency(p.hna),
    stock_value: formatCurrency(p.current_stock * p.hpp),
  }));

  const incomingData = inventoryLogs
    .filter((log) => log.type === 'IN')
    .map((log: any) => ({
      ...log,
      date_log_formatted: formatDate(log.date_log),
      nama_produk: log.products?.nama_produk || '-',
      kode_produk: log.products?.kode_produk || '-',
      nama_pabrik: log.products?.nama_pabrik || '-',
      expired_date_formatted: formatDate(log.expired_date),
    }));

  const outgoingData = inventoryLogs
    .filter((log) => log.type === 'OUT')
    .map((log: any) => ({
      ...log,
      date_log_formatted: formatDate(log.date_log),
      nama_produk: log.products?.nama_produk || '-',
      kode_produk: log.products?.kode_produk || '-',
      nama_pabrik: log.products?.nama_pabrik || '-',
      expired_date_formatted: formatDate(log.expired_date),
    }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Produk</CardTitle>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">Jenis produk terdaftar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stok</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStock.toLocaleString('id-ID')}</div>
            <p className="text-xs text-muted-foreground">Unit tersedia</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Menipis</CardTitle>
            <AlertTriangle className="size-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{lowStockProducts}</div>
            <p className="text-xs text-muted-foreground">Produk dibawah 10 unit</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inventory">
            <Package className="mr-2 size-4" />
            Inventory Level
          </TabsTrigger>
          <TabsTrigger value="incoming">
            <TrendingUp className="mr-2 size-4" />
            Barang Masuk
          </TabsTrigger>
          <TabsTrigger value="outgoing">
            <TrendingDown className="mr-2 size-4" />
            Barang Keluar
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Inventory Level */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Total Stock Keseluruhan</CardTitle>
              <CardDescription>
                Sisa stok saat ini di semua cabang
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={inventoryData}
                columns={[
                  { key: 'nama_produk', label: 'Nama Produk', sortable: true },
                  { key: 'kode_produk', label: 'Kode', sortable: true },
                  { key: 'nama_pabrik', label: 'Pabrik', sortable: true },
                  {
                    key: 'current_stock',
                    label: 'Stok',
                    sortable: true,
                    render: (row) => (
                      <Badge variant={row.current_stock < 10 ? 'destructive' : 'default'}>
                        {row.current_stock}
                      </Badge>
                    ),
                  },
                  { key: 'hpp_formatted', label: 'HPP', sortable: true },
                  { key: 'hna_formatted', label: 'HNA', sortable: true },
                ]}
                searchable
                exportable
                onExport={() => exportToExcel(inventoryData, { filename: 'Inventory_Level.xlsx' })}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Incoming Products */}
        <TabsContent value="incoming">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Barang Masuk (Incoming)</CardTitle>
                <CardDescription>
                  Pencatatan penerimaan barang dari supplier/pabrik
                </CardDescription>
              </div>
              <Dialog open={isIncomingModalOpen} onOpenChange={setIsIncomingModalOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="size-4" />
                    Tambah Barang Masuk
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Form Barang Masuk</DialogTitle>
                    <DialogDescription>
                      Isi formulir berikut untuk mencatat barang masuk
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleIncomingSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Produk *</Label>
                        <ProductCombobox
                          products={products}
                          value={incomingForm.product_id}
                          onValueChange={(value) =>
                            setIncomingForm({ ...incomingForm, product_id: value })
                          }
                          placeholder="Cari produk..."
                          showStock={false}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Jumlah (Qty) *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={incomingForm.qty}
                          onChange={(e) =>
                            setIncomingForm({ ...incomingForm, qty: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>No Lot/Batch *</Label>
                        <Input
                          value={incomingForm.batch_lot_number}
                          onChange={(e) =>
                            setIncomingForm({ ...incomingForm, batch_lot_number: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Expired Date *</Label>
                        <Input
                          type="date"
                          value={incomingForm.expired_date}
                          onChange={(e) =>
                            setIncomingForm({ ...incomingForm, expired_date: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>No PO Supplier *</Label>
                        <Input
                          value={incomingForm.doc_reference}
                          onChange={(e) =>
                            setIncomingForm({ ...incomingForm, doc_reference: e.target.value })
                          }
                          placeholder="Contoh: PO/2024/001"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Tanggal Masuk *</Label>
                        <Input
                          type="date"
                          value={incomingForm.date_log}
                          onChange={(e) =>
                            setIncomingForm({ ...incomingForm, date_log: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="col-span-2 space-y-2">
                        <Label>Cabang/Lokasi *</Label>
                        <Input
                          value={incomingForm.branch_location}
                          onChange={(e) =>
                            setIncomingForm({ ...incomingForm, branch_location: e.target.value })
                          }
                          placeholder="Contoh: Jakarta Pusat"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsIncomingModalOpen(false)}
                      >
                        Batal
                      </Button>
                      <Button type="submit">Simpan</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <DataTable
                data={incomingData}
                columns={[
                  { key: 'date_log_formatted', label: 'Tanggal', sortable: true },
                  { key: 'nama_produk', label: 'Nama Produk', sortable: true },
                  { key: 'kode_produk', label: 'Kode', sortable: true },
                  { key: 'qty', label: 'Qty', sortable: true },
                  { key: 'batch_lot_number', label: 'No Lot', sortable: true },
                  { key: 'expired_date_formatted', label: 'Expired', sortable: true },
                  { key: 'doc_reference', label: 'No PO Supplier', sortable: true },
                  { key: 'branch_location', label: 'Cabang', sortable: true },
                  {
                    key: 'actions',
                    label: 'Aksi',
                    render: (row: any) => (
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          onClick={() => openEditModal(row)}
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          onClick={() => openDeleteDialog(row)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    ),
                  },
                ]}
                searchable
                exportable
                onExport={() => exportToExcel(incomingData, { filename: 'Barang_Masuk.xlsx' })}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Outgoing Products */}
        <TabsContent value="outgoing">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Barang Keluar (Outgoing)</CardTitle>
                <CardDescription>
                  Pencatatan pengiriman barang ke Outlet/RS
                </CardDescription>
              </div>
              <Dialog open={isOutgoingModalOpen} onOpenChange={setIsOutgoingModalOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="size-4" />
                    Tambah Barang Keluar
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Form Barang Keluar</DialogTitle>
                    <DialogDescription>
                      Isi formulir berikut untuk mencatat barang keluar
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleOutgoingSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Produk *</Label>
                        <ProductCombobox
                          products={products}
                          value={outgoingForm.product_id}
                          onValueChange={(value) => {
                            setOutgoingForm({ ...outgoingForm, product_id: value });
                            fetchAvailableLotsForProduct(value);
                          }}
                          placeholder="Cari produk..."
                          showStock={true}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Jumlah (Qty) *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={outgoingForm.qty}
                          onChange={(e) =>
                            setOutgoingForm({ ...outgoingForm, qty: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>No Lot/Batch *</Label>
                        <Select
                          value={outgoingForm.batch_lot_number}
                          onValueChange={(value) => handleLotSelection(value)}
                          required
                          disabled={availableLots.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={availableLots.length === 0 ? "Pilih produk terlebih dahulu" : "Pilih Lot/Batch"} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableLots.map((lot, index) => (
                              <SelectItem key={`${lot.batch_lot_number}-${index}`} value={lot.batch_lot_number}>
                                {lot.batch_lot_number} - Exp: {formatDate(lot.expired_date)} (Stok: {lot.available_qty})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {availableLots.length > 0 
                            ? `${availableLots.length} lot tersedia (FEFO: expired terdekat dipilih otomatis)`
                            : "Pilih produk untuk melihat lot yang tersedia"}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Expired Date *</Label>
                        <Input
                          type="date"
                          value={outgoingForm.expired_date}
                          onChange={(e) =>
                            setOutgoingForm({ ...outgoingForm, expired_date: e.target.value })
                          }
                          required
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                          Auto-filled dari lot yang dipilih
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>No PO Outlet / Surat Jalan *</Label>
                        <Input
                          value={outgoingForm.doc_reference}
                          onChange={(e) =>
                            setOutgoingForm({ ...outgoingForm, doc_reference: e.target.value })
                          }
                          placeholder="Contoh: SJ/2024/001"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Tanggal Keluar *</Label>
                        <Input
                          type="date"
                          value={outgoingForm.date_log}
                          onChange={(e) =>
                            setOutgoingForm({ ...outgoingForm, date_log: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="col-span-2 space-y-2">
                        <Label>Cabang Tujuan *</Label>
                        <Input
                          value={outgoingForm.branch_location}
                          onChange={(e) =>
                            setOutgoingForm({ ...outgoingForm, branch_location: e.target.value })
                          }
                          placeholder="Contoh: Jakarta Selatan"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsOutgoingModalOpen(false)}
                      >
                        Batal
                      </Button>
                      <Button type="submit">Simpan</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <DataTable
                data={outgoingData}
                columns={[
                  { key: 'date_log_formatted', label: 'Tanggal', sortable: true },
                  { key: 'nama_produk', label: 'Nama Produk', sortable: true },
                  { key: 'kode_produk', label: 'Kode', sortable: true },
                  { key: 'qty', label: 'Qty', sortable: true },
                  { key: 'batch_lot_number', label: 'No Lot', sortable: true },
                  { key: 'expired_date_formatted', label: 'Expired', sortable: true },
                  { key: 'doc_reference', label: 'No PO/Surat Jalan', sortable: true },
                  { key: 'branch_location', label: 'Cabang', sortable: true },
                  {
                    key: 'actions',
                    label: 'Aksi',
                    render: (row: any) => (
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          onClick={() => openEditModal(row)}
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          onClick={() => openDeleteDialog(row)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    ),
                  },
                ]}
                searchable
                exportable
                onExport={() => exportToExcel(outgoingData, { filename: 'Barang_Keluar.xlsx' })}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* EDIT DIALOG */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit {editForm.type === 'IN' ? 'Barang Masuk' : 'Barang Keluar'}</DialogTitle>
            <DialogDescription>
              Perbarui data log inventaris
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Produk *</Label>
                <Select
                  value={editForm.product_id}
                  onValueChange={(value) =>
                    setEditForm({ ...editForm, product_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih produk" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.kode_produk} - {p.nama_produk}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Jumlah (Qty) *</Label>
                <Input
                  type="number"
                  min="1"
                  value={editForm.qty}
                  onChange={(e) =>
                    setEditForm({ ...editForm, qty: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>No Lot/Batch *</Label>
                <Input
                  value={editForm.batch_lot_number}
                  onChange={(e) =>
                    setEditForm({ ...editForm, batch_lot_number: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Expired Date *</Label>
                <Input
                  type="date"
                  value={editForm.expired_date}
                  onChange={(e) =>
                    setEditForm({ ...editForm, expired_date: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>{editForm.type === 'IN' ? 'No PO Supplier' : 'No PO Outlet / Surat Jalan'} *</Label>
                <Input
                  value={editForm.doc_reference}
                  onChange={(e) =>
                    setEditForm({ ...editForm, doc_reference: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Tanggal *</Label>
                <Input
                  type="date"
                  value={editForm.date_log}
                  onChange={(e) =>
                    setEditForm({ ...editForm, date_log: e.target.value })
                  }
                  required
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label>Cabang/Lokasi *</Label>
                <Input
                  value={editForm.branch_location}
                  onChange={(e) =>
                    setEditForm({ ...editForm, branch_location: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit">Update</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus log ini?
              <br />
              <br />
              <strong>⚠️ PERHATIAN:</strong> Menghapus log ini akan mempengaruhi stok produk. Pastikan Anda memahami konsekuensinya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}