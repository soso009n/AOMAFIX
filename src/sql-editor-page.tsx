'use client';

import { useState } from 'react';
import { Play, Download, Trash2, History, Database, AlertTriangle, FileCode } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { exportToExcel } from '../utils/excel-export';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export function SqlEditorPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);

  // Daftar query template cepat
  const templates = [
    { label: 'Lihat Semua Transaksi', value: 'SELECT * FROM transactions ORDER BY transaction_date DESC LIMIT 10' },
    { label: 'Lihat Stok Produk', value: 'SELECT * FROM products ORDER BY stock DESC' },
    { label: 'Cek Log Inventory', value: 'SELECT * FROM inventory_logs ORDER BY created_at DESC LIMIT 20' },
    { label: 'Total Penjualan per Customer', value: 'SELECT c.nama_outlet, SUM(t.total_price_final) as total FROM transactions t JOIN customers c ON t.customer_id = c.id GROUP BY c.nama_outlet ORDER BY total DESC' },
  ];

  async function handleRunQuery() {
    if (!query.trim()) {
      toast.error('Query tidak boleh kosong');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults([]);
    setColumns([]);

    try {
      // Memanggil RPC function yang kita buat di Langkah 1
      const { data, error: rpcError } = await supabase.rpc('exec_sql', {
        sql_query: query,
      });

      if (rpcError) throw rpcError;

      // Cek apakah return value mengandung error dari block exception SQL
      if (data && !Array.isArray(data) && data.error) {
        throw new Error(data.error);
      }

      const resultData = data || [];

      if (resultData.length > 0) {
        setResults(resultData);
        // Ambil keys dari object pertama untuk jadi header tabel
        setColumns(Object.keys(resultData[0]));
        toast.success(`Query berhasil! ${resultData.length} baris data ditemukan.`);
        
        // Simpan ke history (limit 5 terakhir)
        setQueryHistory((prev) => [query, ...prev].slice(0, 5));
      } else {
        toast.info('Query berhasil, namun tidak ada data yang ditemukan.');
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan saat menjalankan query.');
      toast.error('SQL Error');
    } finally {
      setIsLoading(false);
    }
  }

  function handleExport() {
    if (results.length === 0) return;
    exportToExcel(results, { filename: 'query_result.xlsx' });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">SQL Editor</h2>
          <p className="text-muted-foreground">
            Jalankan raw query langsung ke database Supabase
          </p>
        </div>
      </div>

      {/* Warning Alert */}
      <Alert variant="destructive" className="bg-orange-50 border-orange-200 text-orange-800">
        <AlertTriangle className="h-4 w-4 stroke-orange-800" />
        <AlertTitle>Peringatan Developer</AlertTitle>
        <AlertDescription>
          Halaman ini memiliki akses langsung ke database. Hati-hati saat menjalankan perintah 
          <code>DELETE</code>, <code>UPDATE</code>, atau <code>DROP</code>. Pastikan query Anda benar sebelum eksekusi.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Kolom Kiri: Input Editor */}
        <div className="md:col-span-3 space-y-4">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-md">
                  <FileCode className="h-5 w-5 text-primary" />
                  Query Input
                </CardTitle>
                
                {/* Quick Templates */}
                <div className="w-[250px]">
                   <Select onValueChange={(val) => setQuery(val)}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Pilih Template Query..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t, i) => (
                        <SelectItem key={i} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  placeholder="SELECT * FROM transactions WHERE..."
                  className="font-mono text-sm min-h-[150px] bg-slate-950 text-slate-50 placeholder:text-slate-500 p-4"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  spellCheck={false}
                />
                
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleRunQuery} 
                      disabled={isLoading}
                      className="gap-2 min-w-[120px]"
                    >
                      {isLoading ? (
                        'Running...'
                      ) : (
                        <>
                          <Play className="h-4 w-4" /> Run Query
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setQuery('')}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" /> Clear
                    </Button>
                  </div>
                  
                  {results.length > 0 && (
                    <Button variant="secondary" onClick={handleExport} className="gap-2">
                      <Download className="h-4 w-4" /> Export Excel
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Executing Query</AlertTitle>
          <AlertDescription className="font-mono mt-2 text-xs">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Results Table */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Query Results
              </CardTitle>
              <Badge variant="outline">{results.length} records found</Badge>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    {columns.map((col) => (
                      <TableHead key={col} className="font-bold text-nowrap">
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {columns.map((col) => (
                        <TableCell key={`${rowIndex}-${col}`} className="max-w-[300px] truncate">
                          {typeof row[col] === 'object' && row[col] !== null 
                            ? JSON.stringify(row[col]) 
                            : String(row[col] ?? '')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History Section */}
      {queryHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <History className="h-4 w-4" />
              Recent History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {queryHistory.map((hist, idx) => (
                <div 
                  key={idx} 
                  className="p-2 bg-muted rounded text-xs font-mono cursor-pointer hover:bg-muted/80 transition-colors truncate"
                  onClick={() => setQuery(hist)}
                >
                  {hist}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}