# PT AOMA Prima Medika - Sistem Manajemen Distribusi Farmasi & Alat Kesehatan

## 🏥 Tentang Sistem

Sistem Manajemen Distribusi Farmasi & Alat Kesehatan adalah aplikasi web enterprise-grade yang dirancang untuk mengelola distribusi produk farmasi dan alat kesehatan dari distributor ke Rumah Sakit, Apotek, dan Outlet kesehatan lainnya.

**Fitur Utama:**
- ✅ Dashboard Gudang dengan 3 segmen (Inventory Level, Barang Masuk, Barang Keluar)
- ✅ Admin Sales untuk monitoring transaksi dengan editable invoice
- ✅ Master Data (Produk, Customer, Sales Team)
- ✅ Auto-calculation untuk harga setelah diskon dan grand total
- ✅ FIFO/FEFO inventory management via database triggers
- ✅ Export to Excel untuk semua data
- ✅ Dark/Light Mode support
- ✅ Responsive design untuk desktop dan mobile

---

## 🎨 Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS v4
- **UI Components:** Shadcn/UI (Custom design system)
- **Database:** Supabase (PostgreSQL)
- **Backend:** Supabase Edge Functions
- **State Management:** React Hooks
- **Icons:** Lucide React
- **Export:** XLSX (Excel export)
- **Theme:** Custom Dark/Light mode

---

## 🚀 Setup Instructions

### 1. Setup Supabase Database

Aplikasi ini memerlukan Supabase sebagai backend. Ikuti langkah berikut:

#### a. Jalankan Migration SQL

Buka file `/supabase/migrations/001_initial_schema.sql` dan jalankan SQL script di Supabase SQL Editor:

1. Login ke [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project Anda
3. Buka **SQL Editor**
4. Copy-paste isi file `001_initial_schema.sql`
5. Klik **Run** untuk menjalankan migration

**Script ini akan membuat:**
- 6 tabel relasional (customers, sales_teams, products, transactions, transaction_items, inventory_logs)
- Indexes untuk performa optimal
- Database Triggers untuk auto-update stok dan total transaksi
- Row Level Security (RLS) policies
- 4 Views untuk query yang lebih mudah
- Sample data untuk testing

#### b. Verifikasi Database

Setelah migration berhasil, verifikasi bahwa semua tabel telah dibuat:
- Buka **Table Editor** di Supabase Dashboard
- Pastikan 6 tabel berikut ada:
  - `customers`
  - `sales_teams`
  - `products`
  - `transactions`
  - `transaction_items`
  - `inventory_logs`

### 2. Koneksi Supabase

Supabase sudah dikonfigurasi dan terhubung. Tidak perlu setup tambahan untuk koneksi.

---

## 📊 Database Schema

### Tabel Utama:

#### 1. **customers** (Data Outlet/Rumah Sakit)
- `nama_outlet`: Nama Rumah Sakit/Apotek
- `alamat`: Alamat lengkap
- `nomor_nib`: Nomor Induk Berusaha (Unique)
- `nama_penanggung_jawab`: Nama PIC
- `npwp`, `sipa`, `idak_cdakb`: Dokumen legal

#### 2. **sales_teams** (Tim Penjualan)
- `nama_sales`: Nama sales person
- `cabang`: Cabang/Area assignment

#### 3. **products** (Master Data Produk)
- `nama_produk`, `kode_produk`, `nama_pabrik`
- `hpp`: Harga Pokok Penjualan (COGS)
- `hna`: Harga Netto Apotek (List Price)
- `current_stock`: Stok saat ini (Auto-updated)

#### 4. **transactions** (Header Transaksi)
- `invoice_number`: Editable invoice number
- `customer_id`, `sales_id`: Foreign keys
- `discount_percent`: Diskon dalam persen
- `total_price_final`: Grand total setelah diskon

#### 5. **transaction_items** (Detail Item)
- `transaction_id`, `product_id`: Foreign keys
- `qty`, `expired_date`
- `hna_at_moment`: Price snapshot
- `total_price_item`: HNA × Qty

#### 6. **inventory_logs** (Log Barang Masuk/Keluar)
- `type`: 'IN' atau 'OUT'
- `product_id`: Foreign key
- `qty`, `batch_lot_number`, `expired_date`
- `doc_reference`: No PO/Surat Jalan
- `branch_location`: Cabang

**Detail lengkap:** Lihat file `/database-schema.md`

---

## 🧭 User Guide

### A. Dashboard Gudang (Warehouse Management)

**Navigasi:** Sidebar → Dashboard Gudang

**3 Segmen:**

#### 1. **Inventory Level** (Stok Keseluruhan)
- Menampilkan stok real-time semua produk
- Kolom: Produk, Kode, Pabrik, Stok, HPP, HNA, Nilai Stok
- Badge merah untuk stok < 10 unit
- Export ke Excel tersedia

#### 2. **Barang Masuk (Incoming)**
- Form untuk mencatat penerimaan barang dari supplier
- Field yang diperlukan:
  - Produk (dropdown)
  - Jumlah (Qty)
  - No Lot/Batch
  - Expired Date
  - **No PO Supplier** (contoh: PO/2024/001)
  - Tanggal Masuk
  - Cabang/Lokasi
- Setelah submit, stok produk akan **otomatis bertambah** via trigger database

#### 3. **Barang Keluar (Outgoing)**
- Form untuk mencatat pengiriman barang ke Outlet/RS
- Field yang diperlukan:
  - Produk (dropdown dengan info stok)
  - Jumlah (Qty)
  - No Lot/Batch
  - Expired Date
  - **No PO Outlet / Surat Jalan** (contoh: SJ/2024/001)
  - Tanggal Keluar
  - Cabang Tujuan
- Setelah submit, stok produk akan **otomatis berkurang** via trigger database
- Jika stok tidak cukup, akan muncul error

---

### B. Admin Sales (Monitoring Transaksi)

**Navigasi:** Sidebar → Admin Sales

**Fitur:**
1. **Ringkasan Transaksi:**
   - Daftar semua transaksi dengan grand total
   - Kolom editable untuk **Nomor Invoice**:
     - Klik icon pensil untuk edit
     - Ketik nomor invoice (contoh: INV/2024/001)
     - Klik ✓ untuk save, atau × untuk cancel
   
2. **Detail Transaksi Per Item:**
   - Rincian lengkap setiap item dalam transaksi
   - Kolom: No Invoice, Rumah Sakit, DPL, Diskon %, Sales, Cabang, Produk, Expired, Qty, HNA, Total Before/After Discount
   - Auto-calculation: Total setelah diskon dihitung otomatis

3. **Export Excel:**
   - Tersedia untuk Ringkasan dan Detail transaksi

**Summary Cards:**
- Total Transaksi
- Total Revenue (setelah diskon)
- Pending Invoice (transaksi tanpa nomor invoice)
- Transaksi Hari Ini

---

### C. Master Data Produk

**Navigasi:** Sidebar → Master Produk

**Fitur:**
- **Tambah Produk:** Klik tombol "+ Tambah Produk"
  - Form field: Nama Produk, Kode Produk (Unique), Nama Pabrik, HPP, HNA
  - HPP = Harga beli dari pabrik (COGS)
  - HNA = Harga jual ke RS/Outlet (sebelum diskon)
  
- **Edit Produk:** Klik icon pensil pada baris produk
  - Kode produk tidak bisa diubah (Unique constraint)
  
- **Hapus Produk:** Klik icon trash (dengan konfirmasi)

- **Export Excel:** Export semua data produk

**Catatan:** Stok produk tidak bisa diubah manual di sini. Stok hanya berubah via Dashboard Gudang (Barang Masuk/Keluar).

---

### D. Master Data Customer (Coming Soon)

Akan berisi CRUD untuk data customer (Rumah Sakit/Outlet) dengan field:
- Nama Outlet, Alamat, Nomor NIB, Nama Penanggung Jawab, NPWP, SIPA, IDAK/CDAKB

---

### E. Master Data Sales Team (Coming Soon)

Akan berisi CRUD untuk data sales team dengan field:
- Nama Sales, Cabang

---

## 💡 Business Logic

### Kalkulasi Harga:
```
Total Item (Before Discount) = HNA × Qty
Total Item (After Discount) = Total Item × (1 - Discount% / 100)
Grand Total Transaction = SUM(All Items After Discount)
```

### Margin Calculation:
```
Margin = (HNA - Discount) - HPP
Margin % = ((HNA - Discount) - HPP) / HPP × 100%
```

### Inventory Management:
- **FIFO/FEFO:** Database trigger otomatis mengurangi/menambah stok
- **Validasi Stok:** Barang keluar tidak boleh melebihi stok tersedia
- **Real-time Update:** Stok ter-update otomatis tanpa reload page

---

## 🎨 UI/UX Features

### Dark/Light Mode
- Toggle theme di topbar (icon bulan/matahari)
- Preference tersimpan di browser localStorage
- Smooth transition

### Responsive Design
- Optimized untuk desktop dan mobile
- Sidebar collapsible
- Table dengan horizontal scroll pada mobile

### Data Table Features
- **Search:** Real-time search di semua kolom
- **Sort:** Klik header kolom untuk sort ascending/descending
- **Pagination:** Otomatis untuk data > 10 baris
- **Export Excel:** Download data dalam format .xlsx

---

## 🔒 Security & Data Privacy

### Row Level Security (RLS)
- Semua tabel dilindungi dengan RLS policies
- Saat ini semua authenticated users memiliki akses penuh
- Di production, sesuaikan policy berdasarkan user roles (Admin, Gudang, Sales)

### Data Protection
- Supabase menggunakan koneksi encrypted (HTTPS)
- Database backup otomatis via Supabase
- **Catatan:** Figma Make tidak diperuntukkan untuk production PII data. Untuk deployment production, gunakan Supabase project sendiri.

---

## 📈 Performance Optimization

- **Database Indexes:** Indexes pada kolom yang sering di-query
- **Database Views:** Pre-computed views untuk query kompleks
- **React Optimization:** useState dan useEffect yang optimal
- **Lazy Loading:** Pagination untuk data besar
- **Auto-refresh:** Data ter-update setelah insert/update/delete

---

## 🐛 Troubleshooting

### Error: "Insufficient stock for product_id"
- **Penyebab:** Barang keluar melebihi stok tersedia
- **Solusi:** Periksa stok di Dashboard Gudang → Inventory Level, pastikan qty yang diinput tidak melebihi stok

### Error: "duplicate key value violates unique constraint"
- **Penyebab:** Kode produk atau Nomor NIB customer sudah ada
- **Solusi:** Gunakan kode/nomor yang berbeda (unique)

### Stok tidak terupdate setelah barang masuk/keluar
- **Penyebab:** Database trigger mungkin belum aktif
- **Solusi:** Jalankan ulang migration SQL script untuk membuat trigger

### Export Excel tidak berfungsi
- **Penyebab:** Library XLSX belum ter-load
- **Solusi:** Refresh page dan coba lagi

---

## 📝 Development Notes

### Branding Colors (AOMA)
- **Primary:** Deep Teal/Navy Blue (#0F4C75, #3A7CA5)
- **Accent:** Terracotta/Red (#E63946)
- **Sidebar:** Dark Teal (#0A3D5C)

### File Structure
```
/
├── App.tsx                              # Main app entry point
├── components/
│   ├── app-layout.tsx                   # Layout with sidebar & topbar
│   ├── theme-provider.tsx               # Dark/Light mode provider
│   ├── dashboard-gudang.tsx             # Warehouse dashboard (3 segments)
│   ├── admin-sales-page.tsx             # Sales monitoring page
│   ├── master-products-page.tsx         # Products CRUD
│   ├── data-table.tsx                   # Reusable data table component
│   └── ui/                              # Shadcn/UI components
├── utils/
│   ├── supabase/
│   │   ├── client.ts                    # Supabase client & helpers
│   │   ├── types.ts                     # TypeScript database types
│   │   └── info.tsx                     # Supabase connection info
│   └── excel-export.ts                  # Excel export utility
├── supabase/
│   ├── functions/server/index.tsx       # Hono web server
│   └── migrations/001_initial_schema.sql # Database migration
├── styles/globals.css                   # Global styles & theme
├── database-schema.md                   # Database documentation
└── README-USER-GUIDE.md                 # This file
```

---

## 🎯 Next Steps & Roadmap

### Phase 2 (Pending Implementation):
- [ ] Master Data Customer CRUD (Full implementation)
- [ ] Master Data Sales Team CRUD (Full implementation)
- [ ] Create Transaction form (Currently transactions must be created via SQL)
- [ ] User Authentication & Authorization
- [ ] Role-based access control (Admin, Gudang, Sales)
- [ ] Email notifications for low stock
- [ ] Transaction reports & analytics
- [ ] Profit margin analysis dashboard
- [ ] Multi-warehouse support
- [ ] Barcode scanning for inventory

### Phase 3 (Future Enhancements):
- [ ] Mobile app (React Native)
- [ ] Real-time notifications (Supabase Realtime)
- [ ] Advanced reporting with charts (Recharts)
- [ ] Integration with accounting software
- [ ] Automated PO generation
- [ ] E-signature for Surat Jalan

---

## 📞 Support

Untuk pertanyaan, bug reports, atau feature requests, silakan hubungi tim development PT AOMA Prima Medika.

---

**Version:** 1.0.0  
**Last Updated:** 28 Januari 2026  
**Developed by:** PT AOMA Prima Medika Development Team  
**Built with:** ❤️ using React, TypeScript, Tailwind CSS, and Supabase

---

## 🙏 Acknowledgments

- **Shadcn/UI** untuk komponen UI yang indah
- **Supabase** untuk database dan backend infrastructure
- **Lucide** untuk icon set yang comprehensive
- **XLSX** untuk Excel export functionality

---

© 2026 PT AOMA Prima Medika. All Rights Reserved.
