// PT AOMA Prima Medika - Admin Sales & Invoicing Page with FULL CRUD
// Features: CREATE, EDIT, DELETE Transactions & Transaction Items

'use client';

import { useState, useEffect } from 'react';
import { Plus, FileText, Edit2, Trash2, Check, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { DataTable } from './data-table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { toast } from 'sonner';
import { supabase, formatCurrency, formatDate, calculateDiscountedPrice } from '../utils/supabase/client';
import type { Transaction, Customer, SalesTeam, Product, TransactionInsert, TransactionItemInsert } from '../utils/supabase/types';
import { exportToExcel } from '../utils/excel-export';
import { ProductCombobox } from './product-combobox';

// Define Interface locally for InventoryLog since it seems missing from your supabase types
interface InventoryLog {
  id: string;
  product_id: string;
  batch_lot_number: string;
  expired_date: string;
  qty: number;
  movement_type: 'IN' | 'OUT';
  created_at: string;
}

interface TransactionWithDetails extends Transaction {
  customer: Customer;
  sales_team: SalesTeam;
  items: any[];
}

interface TransactionFormData {
  customer_id: string;
  sales_id: string;
  dpl_name: string;
  discount_percent: string;
  transaction_date: string;
  invoice_number: string;
}

interface TransactionItemFormData {
  product_id: string;
  qty: string;
  expired_date: string;
  batch_lot_number?: string; // Optional: for tracking lot
}

export function AdminSalesPage() {
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesTeams, setSalesTeams] = useState<SalesTeam[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithDetails | null>(null);
  
  // Inline invoice editing
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editedInvoiceNumber, setEditedInvoiceNumber] = useState('');

  // Available lots for each item (keyed by item index)
  const [availableLotsByIndex, setAvailableLotsByIndex] = useState<Record<number, Array<{
    batch_lot_number: string;
    expired_date: string;
    available_qty: number;
  }>>>({});

  // Form data for CREATE
  const [createForm, setCreateForm] = useState<TransactionFormData>({
    customer_id: '',
    sales_id: '',
    dpl_name: '',
    discount_percent: '0',
    transaction_date: new Date().toISOString().split('T')[0],
    invoice_number: '',
  });

  // Form data for EDIT
  const [editForm, setEditForm] = useState<TransactionFormData>({
    customer_id: '',
    sales_id: '',
    dpl_name: '',
    discount_percent: '0',
    transaction_date: '',
    invoice_number: '',
  });

  // Items for transaction (used in both create and edit)
  const [transactionItems, setTransactionItems] = useState<TransactionItemFormData[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      // Load all necessary data
      const [txData, custData, salesData, prodData] = await Promise.all([
        supabase
          .from('transactions')
          .select('*, customer:customers(*), sales_team:sales_teams(*)')
          .order('transaction_date', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase.from('customers').select('*').order('nama_outlet'),
        supabase.from('sales_teams').select('*').order('nama_sales'),
        supabase.from('products').select('*').order('nama_produk'),
      ]);

      if (txData.error) throw txData.error;
      if (custData.error) throw custData.error;
      if (salesData.error) throw salesData.error;
      if (prodData.error) throw prodData.error;

      setCustomers(custData.data || []);
      setSalesTeams(salesData.data || []);
      setProducts(prodData.data || []);

      // Load transaction items for each transaction
      const transactionsWithItems = await Promise.all(
        (txData.data || []).map(async (tx: any) => {
          const { data: itemsData } = await supabase
            .from('transaction_items')
            .select('*, product:products(*)')
            .eq('transaction_id', tx.id);

          return {
            ...tx,
            items: itemsData || [],
          };
        })
      );

      setTransactions(transactionsWithItems as TransactionWithDetails[]);
    } catch (error: any) {
      toast.error('Error loading data: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }

  // ============================================
  // CREATE TRANSACTION
  // ============================================
  async function handleCreateTransaction(e: React.FormEvent) {
    e.preventDefault();
    
    if (transactionItems.length === 0) {
      toast.error('Tambahkan minimal 1 item produk!');
      return;
    }

    try {
      // 1. Insert transaction header
      const newTransaction: TransactionInsert = {
        customer_id: createForm.customer_id,
        sales_id: createForm.sales_id,
        dpl_name: createForm.dpl_name || null,
        discount_percent: parseFloat(createForm.discount_percent),
        transaction_date: createForm.transaction_date,
        invoice_number: createForm.invoice_number || null,
      };

      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .insert(newTransaction as any) // Cast to any to bypass strict type check
        .select()
        .single();

      if (txError) throw txError;

      // 2. Insert transaction items
      const items: TransactionItemInsert[] = transactionItems.map((item) => {
        const product = products.find((p) => p.id === item.product_id);
        const qty = parseInt(item.qty);
        const hna = product?.hna || 0;
        const total = qty * hna;

        return {
          transaction_id: txData.id,
          product_id: item.product_id,
          qty: qty,
          expired_date: item.expired_date,
          hna_at_moment: hna,
          total_price_item: total,
          batch_lot_number: item.batch_lot_number || null,
        };
      });

      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(items as any) // Cast to any to bypass strict type check
        .select(); // Added select() for consistency, though not strictly needed for insert-only

      if (itemsError) throw itemsError;

      toast.success('✅ Transaksi berhasil dibuat!');
      setIsCreateModalOpen(false);
      resetCreateForm();
      loadData();
    } catch (error: any) {
      toast.error('Error creating transaction: ' + error.message);
    }
  }

  // ============================================
  // EDIT TRANSACTION
  // ============================================
  function openEditModal(transaction: TransactionWithDetails) {
    setSelectedTransaction(transaction);
    setEditForm({
      customer_id: transaction.customer_id,
      sales_id: transaction.sales_id,
      dpl_name: transaction.dpl_name || '',
      discount_percent: transaction.discount_percent.toString(),
      transaction_date: transaction.transaction_date,
      invoice_number: transaction.invoice_number || '',
    });

    // Load existing items
    const items: TransactionItemFormData[] = transaction.items.map((item: any) => ({
      product_id: item.product_id,
      qty: item.qty.toString(),
      expired_date: item.expired_date,
      batch_lot_number: item.batch_lot_number || '',
    }));
    setTransactionItems(items);
    setIsEditModalOpen(true);
  }

  async function handleEditTransaction(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedTransaction) return;
    if (transactionItems.length === 0) {
      toast.error('Tambahkan minimal 1 item produk!');
      return;
    }

    try {
      // 1. Update transaction header
      const { error: txError } = await supabase
        .from('transactions')
        .update({
          customer_id: editForm.customer_id,
          sales_id: editForm.sales_id,
          dpl_name: editForm.dpl_name || null,
          discount_percent: parseFloat(editForm.discount_percent),
          transaction_date: editForm.transaction_date,
          invoice_number: editForm.invoice_number || null,
        } as any) // Cast to any to bypass strict type check
        .eq('id', selectedTransaction.id);

      if (txError) throw txError;

      // 2. Delete old items
      const { error: deleteError } = await supabase
        .from('transaction_items')
        .delete()
        .eq('transaction_id', selectedTransaction.id);

      if (deleteError) throw deleteError;

      // 3. Insert new items
      const items: TransactionItemInsert[] = transactionItems.map((item) => {
        const product = products.find((p) => p.id === item.product_id);
        const qty = parseInt(item.qty);
        const hna = product?.hna || 0;
        const total = qty * hna;

        return {
          transaction_id: selectedTransaction.id,
          product_id: item.product_id,
          qty: qty,
          expired_date: item.expired_date,
          hna_at_moment: hna,
          total_price_item: total,
          batch_lot_number: item.batch_lot_number || null,
        };
      });

      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(items as any); // Cast to any to bypass strict type check

      if (itemsError) throw itemsError;

      toast.success('✅ Transaksi berhasil diupdate!');
      setIsEditModalOpen(false);
      setSelectedTransaction(null);
      loadData();
    } catch (error: any) {
      toast.error('Error updating transaction: ' + error.message);
    }
  }

  // ============================================
  // DELETE TRANSACTION
  // ============================================
  function openDeleteDialog(transaction: TransactionWithDetails) {
    setSelectedTransaction(transaction);
    setIsDeleteDialogOpen(true);
  }

  async function handleDeleteTransaction() {
    if (!selectedTransaction) return;

    try {
      // Delete transaction (cascade will delete items automatically)
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', selectedTransaction.id);

      if (error) throw error;

      toast.success('✅ Transaksi berhasil dihapus!');
      setIsDeleteDialogOpen(false);
      setSelectedTransaction(null);
      loadData();
    } catch (error: any) {
      toast.error('Error deleting transaction: ' + error.message);
    }
  }

  // ============================================
  // INLINE INVOICE EDIT
  // ============================================
  async function handleInvoiceUpdate(transactionId: string, newInvoiceNumber: string) {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ invoice_number: newInvoiceNumber } as any) // Cast to any to bypass strict type check
        .eq('id', transactionId);

      if (error) throw error;

      toast.success('✅ Invoice berhasil diupdate!');
      setEditingInvoiceId(null);
      setEditedInvoiceNumber('');
      loadData();
    } catch (error: any) {
      toast.error('Error updating invoice: ' + error.message);
    }
  }

  // ============================================
  // ITEM MANAGEMENT (for Create/Edit forms)
  // ============================================
  
  // Fetch available lots for a product (FEFO logic)
  async function fetchAvailableLotsForProduct(productId: string, itemIndex: number) {
    if (!productId) return;

    try {
      // Fetch all inventory logs for this product
      // We explicitly check for inventory_logs, and cast the result because the types seem missing in your setup
      const { data: rawLogs, error } = await supabase
        .from('inventory_logs' as any) // Cast table name to any if it doesn't exist in Database types
        .select('*')
        .eq('product_id', productId)
        .order('expired_date', { ascending: true }); // Sort by expired date (FEFO)

      if (error) throw error;
      
      const logs = rawLogs as unknown as InventoryLog[];

      // Group by batch_lot_number and expired_date, calculate available qty
      const lotMap = new Map<string, { batch_lot_number: string; expired_date: string; available_qty: number }>();

      (logs || []).forEach((log) => {
        const key = `${log.batch_lot_number}_${log.expired_date}`;
        
        if (!lotMap.has(key)) {
          lotMap.set(key, {
            batch_lot_number: log.batch_lot_number,
            expired_date: log.expired_date,
            available_qty: 0,
          });
        }

        const lot = lotMap.get(key)!;
        if (log.movement_type === 'IN') {
          lot.available_qty += log.qty;
        } else if (log.movement_type === 'OUT') {
          lot.available_qty -= log.qty;
        }
      });

      // Filter only lots with available qty > 0
      const availableLots = Array.from(lotMap.values())
        .filter((lot) => lot.available_qty > 0)
        .sort((a, b) => new Date(a.expired_date).getTime() - new Date(b.expired_date).getTime());

      // Store available lots for this item index
      setAvailableLotsByIndex((prev) => ({
        ...prev,
        [itemIndex]: availableLots,
      }));

      // Auto-populate with first available lot (FEFO)
      if (availableLots.length > 0) {
        const firstLot = availableLots[0];
        const updated = [...transactionItems];
        updated[itemIndex].expired_date = firstLot.expired_date;
        updated[itemIndex].batch_lot_number = firstLot.batch_lot_number;
        setTransactionItems(updated);
        
        toast.success(`✅ Auto-populated: Lot ${firstLot.batch_lot_number} (Exp: ${formatDate(firstLot.expired_date)}, Stok: ${firstLot.available_qty})`);
      } else {
        toast.warning('⚠️ Tidak ada stok tersedia untuk produk ini');
      }
    } catch (error: any) {
      console.error('Error fetching lots:', error);
      toast.error('Error fetching lots: ' + error.message);
    }
  }

  function addItem() {
    setTransactionItems([
      ...transactionItems,
      { product_id: '', qty: '1', expired_date: '', batch_lot_number: '' },
    ]);
  }

  function removeItem(index: number) {
    setTransactionItems(transactionItems.filter((_, i) => i !== index));
    // Clean up available lots for this index
    setAvailableLotsByIndex((prev) => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
  }

  function updateItem(index: number, field: keyof TransactionItemFormData, value: string) {
    const updated = [...transactionItems];
    updated[index][field] = value;
    setTransactionItems(updated);

    // If product changed, fetch available lots
    if (field === 'product_id' && value) {
      fetchAvailableLotsForProduct(value, index);
    }
  }

  // ============================================
  // RESET FORMS
  // ============================================
  function resetCreateForm() {
    setCreateForm({
      customer_id: '',
      sales_id: '',
      dpl_name: '',
      discount_percent: '0',
      transaction_date: new Date().toISOString().split('T')[0],
      invoice_number: '',
    });
    setTransactionItems([]);
  }

  // ============================================
  // SUMMARY CALCULATIONS
  // ============================================
  const totalTransactions = transactions.length;
  const totalRevenue = transactions.reduce((sum, tx) => sum + tx.total_price_final, 0);
  const todayTransactions = transactions.filter(
    (tx) => new Date(tx.transaction_date).toDateString() === new Date().toDateString()
  ).length;

  // ============================================
  // TABLE DATA PREPARATION
  // ============================================
  const transactionSummaryData = transactions.map((tx) => ({
    id: tx.id,
    invoice_number: tx.invoice_number || '(Belum diisi)',
    customer_name: tx.customer?.nama_outlet || '-',
    sales_name: tx.sales_team?.nama_sales || '-',
    transaction_date: formatDate(tx.transaction_date),
    discount_percent: `${tx.discount_percent}%`,
    total_items: tx.items.length,
    grand_total: formatCurrency(tx.total_price_final),
    _raw: tx, // Store raw data for actions
  }));

  const tableData = transactions.flatMap((tx) =>
    tx.items.map((item: any) => {
      const totalAfterDiscount = calculateDiscountedPrice(
        item.total_price_item,
        tx.discount_percent
      );

      return {
        transaction_id: tx.id,
        invoice_number: tx.invoice_number || '',
        customer_name: tx.customer?.nama_outlet || '-',
        dpl_name: tx.dpl_name || '-',
        discount_percent: tx.discount_percent,
        sales_name: tx.sales_team?.nama_sales || '-',
        cabang: tx.sales_team?.cabang || '-',
        product_name: item.product?.nama_produk || '-',
        expired_date: formatDate(item.expired_date),
        qty: item.qty,
        hna_price: formatCurrency(item.hna_at_moment),
        total_before_discount: formatCurrency(item.total_price_item),
        total_after_discount: formatCurrency(totalAfterDiscount),
        transaction_date: formatDate(tx.transaction_date),
      };
    })
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
            <FileText className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
            <p className="text-xs text-muted-foreground">Transaksi tercatat</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <FileText className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">Setelah diskon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transaksi Hari Ini</CardTitle>
            <FileText className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayTransactions}</div>
            <p className="text-xs text-muted-foreground">Transaksi baru</p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Summary Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Ringkasan Transaksi</CardTitle>
            <CardDescription>
              Daftar transaksi penjualan dengan grand total per transaksi
            </CardDescription>
          </div>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="size-4" />
                Buat Transaksi Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Buat Transaksi Baru</DialogTitle>
                <DialogDescription>
                  Isi data transaksi dan tambahkan item produk
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateTransaction} className="space-y-6">
                {/* Transaction Header */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Customer / Outlet *</Label>
                    <Select
                      value={createForm.customer_id}
                      onValueChange={(value: string) =>
                        setCreateForm({ ...createForm, customer_id: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nama_outlet}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Sales Team *</Label>
                    <Select
                      value={createForm.sales_id}
                      onValueChange={(value: string) =>
                        setCreateForm({ ...createForm, sales_id: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih sales" />
                      </SelectTrigger>
                      <SelectContent>
                        {salesTeams.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.nama_sales} - {s.cabang}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>DPL Name</Label>
                    <Input
                      value={createForm.dpl_name}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, dpl_name: e.target.value })
                      }
                      placeholder="Nama DPL (opsional)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tanggal Transaksi *</Label>
                    <Input
                      type="date"
                      value={createForm.transaction_date}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, transaction_date: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Diskon (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={createForm.discount_percent}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, discount_percent: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>No Invoice</Label>
                    <Input
                      value={createForm.invoice_number}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, invoice_number: e.target.value })
                      }
                      placeholder="INV/2024/001 (opsional)"
                    />
                  </div>
                </div>

                {/* Transaction Items */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Item Produk</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                      <Plus className="size-4 mr-2" />
                      Tambah Item
                    </Button>
                  </div>

                  {transactionItems.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Belum ada item. Klik "Tambah Item" untuk menambahkan produk.
                    </div>
                  )}

                  {transactionItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end border rounded-lg p-3">
                      <div className="col-span-5 space-y-2">
                        <Label className="text-xs">Produk *</Label>
                        <ProductCombobox
                          products={products}
                          value={item.product_id}
                          onValueChange={(value: string) => updateItem(index, 'product_id', value)}
                          placeholder="Cari produk..."
                          showStock={true}
                        />
                      </div>

                      <div className="col-span-2 space-y-2">
                        <Label className="text-xs">Qty *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => updateItem(index, 'qty', e.target.value)}
                          required
                        />
                      </div>

                      <div className="col-span-4 space-y-2">
                        <Label className="text-xs">Expired Date *</Label>
                        <Input
                          type="date"
                          value={item.expired_date}
                          onChange={(e) => updateItem(index, 'expired_date', e.target.value)}
                          required
                        />
                      </div>

                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button type="submit">Simpan Transaksi</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <DataTable
            data={transactionSummaryData}
            columns={[
              {
                key: 'invoice_number',
                label: 'No Invoice',
                sortable: true,
                render: (row: any) => {
                  const isEditing = editingInvoiceId === row.id;

                  return (
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <Input
                            value={editedInvoiceNumber}
                            onChange={(e) => setEditedInvoiceNumber(e.target.value)}
                            className="h-8 w-32"
                            placeholder="INV/2024/001"
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={() =>
                              handleInvoiceUpdate(row.id, editedInvoiceNumber)
                            }
                          >
                            <Check className="size-4 text-green-600" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={() => {
                              setEditingInvoiceId(null);
                              setEditedInvoiceNumber('');
                            }}
                          >
                            <X className="size-4 text-destructive" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className={!row._raw.invoice_number ? 'text-muted-foreground italic' : ''}>
                            {row.invoice_number}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={() => {
                              setEditingInvoiceId(row.id);
                              setEditedInvoiceNumber(row._raw.invoice_number || '');
                            }}
                          >
                            <Edit2 className="size-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  );
                },
              },
              { key: 'customer_name', label: 'Customer', sortable: true },
              { key: 'sales_name', label: 'Sales', sortable: true },
              { key: 'transaction_date', label: 'Tanggal', sortable: true },
              { key: 'discount_percent', label: 'Diskon', sortable: true },
              { key: 'total_items', label: 'Total Item', sortable: true },
              {
                key: 'grand_total',
                label: 'Grand Total',
                sortable: true,
                render: (row) => (
                  <span className="font-semibold text-primary">{row.grand_total}</span>
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
              exportToExcel(transactionSummaryData, { filename: 'Ringkasan_Transaksi.xlsx' })
            }
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Detailed Transaction Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detail Transaksi Per Item</CardTitle>
          <CardDescription>
            Rincian lengkap setiap item dalam transaksi penjualan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={tableData}
            columns={[
              { key: 'invoice_number', label: 'No Invoice', sortable: true },
              { key: 'customer_name', label: 'Rumah Sakit', sortable: true },
              { key: 'dpl_name', label: 'DPL', sortable: true },
              { key: 'discount_percent', label: 'Diskon %', sortable: true },
              { key: 'sales_name', label: 'Sales', sortable: true },
              { key: 'cabang', label: 'Cabang', sortable: true },
              { key: 'product_name', label: 'Produk', sortable: true },
              { key: 'expired_date', label: 'Expired', sortable: true },
              { key: 'qty', label: 'Qty', sortable: true },
              { key: 'hna_price', label: 'HNA', sortable: true },
              { key: 'total_before_discount', label: 'Total (Before)', sortable: true },
              {
                key: 'total_after_discount',
                label: 'Total (After Discount)',
                sortable: true,
                render: (row) => (
                  <span className="font-semibold text-green-600">
                    {row.total_after_discount}
                  </span>
                ),
              },
              { key: 'transaction_date', label: 'Tanggal', sortable: true },
            ]}
            searchable
            exportable
            onExport={() =>
              exportToExcel(tableData, { filename: 'Detail_Transaksi_Items.xlsx' })
            }
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* EDIT MODAL */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Transaksi</DialogTitle>
            <DialogDescription>
              Perbarui data transaksi dan item produk
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditTransaction} className="space-y-6">
            {/* Transaction Header */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer / Outlet *</Label>
                <Select
                  value={editForm.customer_id}
                  onValueChange={(value: string) =>
                    setEditForm({ ...editForm, customer_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nama_outlet}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sales Team *</Label>
                <Select
                  value={editForm.sales_id}
                  onValueChange={(value: string) =>
                    setEditForm({ ...editForm, sales_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih sales" />
                  </SelectTrigger>
                  <SelectContent>
                    {salesTeams.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nama_sales} - {s.cabang}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>DPL Name</Label>
                <Input
                  value={editForm.dpl_name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, dpl_name: e.target.value })
                  }
                  placeholder="Nama DPL (opsional)"
                />
              </div>

              <div className="space-y-2">
                <Label>Tanggal Transaksi *</Label>
                <Input
                  type="date"
                  value={editForm.transaction_date}
                  onChange={(e) =>
                    setEditForm({ ...editForm, transaction_date: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Diskon (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={editForm.discount_percent}
                  onChange={(e) =>
                    setEditForm({ ...editForm, discount_percent: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>No Invoice</Label>
                <Input
                  value={editForm.invoice_number}
                  onChange={(e) =>
                    setEditForm({ ...editForm, invoice_number: e.target.value })
                  }
                  placeholder="INV/2024/001 (opsional)"
                />
              </div>
            </div>

            {/* Transaction Items */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Item Produk</h3>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="size-4 mr-2" />
                  Tambah Item
                </Button>
              </div>

              {transactionItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Belum ada item. Klik "Tambah Item" untuk menambahkan produk.
                </div>
              )}

              {transactionItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end border rounded-lg p-3">
                  <div className="col-span-5 space-y-2">
                    <Label className="text-xs">Produk *</Label>
                    <ProductCombobox
                      products={products}
                      value={item.product_id}
                      onValueChange={(value: string) => updateItem(index, 'product_id', value)}
                      placeholder="Cari produk..."
                      showStock={true}
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label className="text-xs">Qty *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => updateItem(index, 'qty', e.target.value)}
                      required
                    />
                  </div>

                  <div className="col-span-4 space-y-2">
                    <Label className="text-xs">Expired Date *</Label>
                    <Input
                      type="date"
                      value={item.expired_date}
                      onChange={(e) => updateItem(index, 'expired_date', e.target.value)}
                      required
                    />
                  </div>

                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit">Update Transaksi</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus Transaksi</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus transaksi ini?
              <br />
              <br />
              <strong>Invoice:</strong> {selectedTransaction?.invoice_number || '(Belum diisi)'}
              <br />
              <strong>Customer:</strong> {selectedTransaction?.customer?.nama_outlet}
              <br />
              <strong>Total Items:</strong> {selectedTransaction?.items.length}
              <br />
              <strong>Grand Total:</strong> {formatCurrency(selectedTransaction?.total_price_final || 0)}
              <br />
              <br />
              ⚠️ <strong>PERHATIAN:</strong> Semua item transaksi akan ikut terhapus. Aksi ini tidak dapat dibatalkan!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTransaction}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Hapus Transaksi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}