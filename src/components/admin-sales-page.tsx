// PT AOMA Prima Medika - Admin Sales & Invoicing Page
// Features: Transaction monitoring, Editable invoice numbers, Auto-calculation

'use client';

import { useState, useEffect } from 'react';
import { Plus, FileText, Edit2, Check, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { DataTable } from './data-table';
import { toast } from 'sonner';
import { supabase, formatCurrency, formatDate, calculateDiscountedPrice } from '../utils/supabase/client';
import type { Transaction, Customer, SalesTeam, TransactionItemDetail } from '../utils/supabase/types';
import { exportToExcel } from '../utils/excel-export';

interface TransactionWithDetails extends Transaction {
  customer: Customer;
  sales_team: SalesTeam;
  items: TransactionItemDetail[];
}

export function AdminSalesPage() {
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editedInvoiceNumber, setEditedInvoiceNumber] = useState('');

  useEffect(() => {
    loadTransactions();
  }, []);

  async function loadTransactions() {
    setIsLoading(true);
    try {
      // Load transactions with related data
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          customer:customers(*),
          sales_team:sales_teams(*)
        `)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Load transaction items for each transaction
      const transactionsWithItems = await Promise.all(
        (data || []).map(async (tx: any) => {
          const { data: itemsData } = await supabase
            .from('transaction_items')
            .select('*, product:products(*)')
            .eq('transaction_id', tx.id);

          return {
            ...tx,
            customer: tx.customer,
            sales_team: tx.sales_team,
            items: itemsData || [],
          };
        })
      );

      setTransactions(transactionsWithItems as TransactionWithDetails[]);
    } catch (error: any) {
      toast.error('Error loading transactions: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleInvoiceUpdate(transactionId: string, newInvoiceNumber: string) {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ invoice_number: newInvoiceNumber })
        .eq('id', transactionId);

      if (error) throw error;

      toast.success('Nomor invoice berhasil diupdate!');
      setEditingInvoiceId(null);
      setEditedInvoiceNumber('');
      loadTransactions();
    } catch (error: any) {
      toast.error('Error updating invoice: ' + error.message);
    }
  }

  // Calculate summary statistics
  const totalTransactions = transactions.length;
  const totalRevenue = transactions.reduce((sum, tx) => sum + tx.total_price_final, 0);
  const pendingInvoices = transactions.filter((tx) => !tx.invoice_number).length;
  const todayTransactions = transactions.filter(
    (tx) => new Date(tx.transaction_date).toDateString() === new Date().toDateString()
  ).length;

  // Prepare data for main table (flattened transaction items)
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

  // Group by transaction for grand total display
  const transactionSummaryData = transactions.map((tx) => ({
    invoice_number: tx.invoice_number || '(Belum diisi)',
    customer_name: tx.customer?.nama_outlet || '-',
    sales_name: tx.sales_team?.nama_sales || '-',
    transaction_date: formatDate(tx.transaction_date),
    discount_percent: `${tx.discount_percent}%`,
    total_items: tx.items.length,
    grand_total: formatCurrency(tx.total_price_final),
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Pending Invoice</CardTitle>
            <FileText className="size-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{pendingInvoices}</div>
            <p className="text-xs text-muted-foreground">Belum ada nomor invoice</p>
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
        <CardHeader>
          <CardTitle>Ringkasan Transaksi</CardTitle>
          <CardDescription>
            Daftar transaksi penjualan dengan grand total per transaksi
          </CardDescription>
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
                  const transaction = transactions.find(
                    (tx) =>
                      (tx.invoice_number || '(Belum diisi)') === row.invoice_number &&
                      tx.customer?.nama_outlet === row.customer_name
                  );

                  if (!transaction) return row.invoice_number;

                  const isEditing = editingInvoiceId === transaction.id;

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
                              handleInvoiceUpdate(transaction.id, editedInvoiceNumber)
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
                          <span className={!transaction.invoice_number ? 'text-muted-foreground italic' : ''}>
                            {row.invoice_number}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={() => {
                              setEditingInvoiceId(transaction.id);
                              setEditedInvoiceNumber(transaction.invoice_number || '');
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
    </div>
  );
}
