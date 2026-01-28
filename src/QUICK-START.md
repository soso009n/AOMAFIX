# 🚀 Quick Start Guide - PT AOMA Prima Medika

## ⚡ Setup Database dalam 5 Menit

### Step 1: Buka Supabase SQL Editor

1. Login ke [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project Anda yang terhubung dengan aplikasi ini
3. Di sidebar kiri, klik **SQL Editor**
4. Klik tombol **+ New Query**

### Step 2: Jalankan Migration Script

1. Buka file `/supabase/migrations/001_initial_schema.sql` di project ini
2. **Copy seluruh isi file** (Ctrl+A → Ctrl+C)
3. **Paste di SQL Editor** Supabase (Ctrl+V)
4. Klik tombol **Run** di pojok kanan bawah
5. Tunggu beberapa detik hingga muncul pesan **Success**

✅ **Database siap digunakan!**

### Step 3: Verifikasi Setup

Cek di **Table Editor** di Supabase Dashboard. Pastikan 6 tabel berikut telah dibuat:

- ✅ `customers`
- ✅ `sales_teams`
- ✅ `products`
- ✅ `transactions`
- ✅ `transaction_items`
- ✅ `inventory_logs`

### Step 4: Cek Sample Data

Migration script sudah menyertakan sample data untuk testing. Buka tabel `products` dan Anda akan melihat 5 produk contoh:

1. Paracetamol 500mg
2. Amoxicillin 500mg
3. Masker 3 Ply
4. Hand Sanitizer
5. Thermometer Digital

---

## 🎮 Cara Menggunakan Aplikasi

### 1. Dashboard Gudang (Halaman Utama)

Ini adalah halaman pertama yang muncul saat aplikasi dibuka.

#### **Tab 1: Inventory Level**
- Lihat stok real-time semua produk
- Produk dengan stok < 10 akan ditandai dengan badge merah

#### **Tab 2: Barang Masuk**
1. Klik tombol **"+ Tambah Barang Masuk"**
2. Isi form:
   - Pilih produk dari dropdown
   - Masukkan qty (contoh: 100)
   - No Lot/Batch (contoh: LOT2024001)
   - Expired Date (pilih tanggal di masa depan)
   - No PO Supplier (contoh: PO/SUP/2024/001)
   - Tanggal Masuk (hari ini)
   - Cabang (contoh: Jakarta Pusat)
3. Klik **Simpan**
4. ✅ **Stok otomatis bertambah!** Cek di tab Inventory Level

#### **Tab 3: Barang Keluar**
1. Klik tombol **"+ Tambah Barang Keluar"**
2. Isi form:
   - Pilih produk (akan menampilkan stok tersedia)
   - Masukkan qty (harus ≤ stok tersedia)
   - No Lot/Batch (contoh: LOT2024001)
   - Expired Date
   - No PO Outlet / Surat Jalan (contoh: SJ/2024/001)
   - Tanggal Keluar
   - Cabang Tujuan (contoh: Jakarta Selatan)
3. Klik **Simpan**
4. ✅ **Stok otomatis berkurang!** Cek di tab Inventory Level

---

### 2. Admin Sales (Monitoring Transaksi)

Navigasi: **Sidebar → Admin Sales**

**Catatan:** Saat ini transaksi harus dibuat manual via SQL karena form create transaction belum diimplementasikan di UI. Ini dalam roadmap Phase 2.

**Untuk testing, Anda bisa:**
1. Insert manual transaksi via Supabase SQL Editor
2. Atau gunakan sample data yang sudah ada (jika ada di migration)

**Fitur yang sudah berfungsi:**
- ✅ View semua transaksi
- ✅ Edit nomor invoice (klik icon pensil)
- ✅ Export ke Excel
- ✅ Auto-calculation total setelah diskon

---

### 3. Master Data Produk

Navigasi: **Sidebar → Master Produk**

#### Tambah Produk Baru:
1. Klik **"+ Tambah Produk"**
2. Isi form:
   - Nama Produk: Contoh "Vitamin C 1000mg"
   - Kode Produk: Contoh "VIT-001" (harus unique)
   - Nama Pabrik: Contoh "Kalbe Farma"
   - HPP: Contoh "25000" (harga beli dari pabrik)
   - HNA: Contoh "35000" (harga jual ke RS, harus ≥ HPP)
3. Klik **Simpan**
4. ✅ Produk baru muncul di tabel

#### Edit Produk:
1. Klik icon **pensil** di baris produk
2. Ubah data (kecuali Kode Produk yang locked)
3. Klik **Update**

#### Hapus Produk:
1. Klik icon **trash**
2. Konfirmasi hapus
3. ⚠️ **Perhatian:** Produk yang sudah ada transaksi tidak bisa dihapus

---

## 🎨 Tips & Tricks

### Toggle Dark Mode
- Klik icon **Bulan/Matahari** di topbar kanan atas
- Preference tersimpan otomatis

### Collapse Sidebar
- Klik icon **<** di header sidebar untuk minimize
- Berguna untuk layar kecil atau fokus pada data

### Search Data
- Setiap tabel punya search box
- Ketik apa saja untuk filter real-time

### Export Excel
- Klik tombol **Export Excel** di setiap tabel
- File .xlsx otomatis terdownload
- Buka dengan Microsoft Excel atau Google Sheets

### Pagination
- Untuk data > 10 baris, pagination otomatis muncul
- Navigasi dengan arrow buttons di bawah tabel

---

## 🧪 Testing Workflow (Contoh Lengkap)

### Scenario: Distribusi 50 unit Paracetamol ke RS Cipto

#### Step 1: Cek Stok Awal
1. Buka **Dashboard Gudang → Tab Inventory Level**
2. Lihat stok Paracetamol saat ini (contoh: 0 unit)

#### Step 2: Terima Barang dari Supplier
1. Buka **Dashboard Gudang → Tab Barang Masuk**
2. Klik **+ Tambah Barang Masuk**
3. Isi form:
   - Produk: Paracetamol 500mg
   - Qty: 100
   - No Lot: PARA2024001
   - Expired: 31/12/2025
   - No PO Supplier: PO/KF/2024/001
   - Tanggal: Hari ini
   - Cabang: Jakarta Pusat
4. Klik **Simpan**
5. ✅ Stok Paracetamol sekarang: **100 unit**

#### Step 3: Kirim Barang ke RS
1. Buka **Dashboard Gudang → Tab Barang Keluar**
2. Klik **+ Tambah Barang Keluar**
3. Isi form:
   - Produk: Paracetamol 500mg (Stok: 100)
   - Qty: 50
   - No Lot: PARA2024001
   - Expired: 31/12/2025
   - No PO Outlet: PO/RSCM/2024/001
   - Tanggal: Hari ini
   - Cabang Tujuan: Jakarta Pusat (RS Cipto)
4. Klik **Simpan**
5. ✅ Stok Paracetamol sekarang: **50 unit** (100 - 50)

#### Step 4: Verifikasi Stok
1. Kembali ke **Tab Inventory Level**
2. Refresh jika perlu
3. Stok Paracetamol menunjukkan: **50 unit** ✅

---

## ❓ FAQ

### Q: Bagaimana cara menambah transaksi penjualan?
**A:** Saat ini harus via SQL manual. Form create transaction akan diimplementasikan di Phase 2.

### Q: Bisa hapus log barang masuk/keluar?
**A:** Tidak, karena akan merusak history. Stok akan menjadi tidak akurat. Hanya insert yang diperbolehkan.

### Q: Stok negatif bisa terjadi?
**A:** Tidak. Database trigger akan reject transaksi barang keluar jika qty melebihi stok.

### Q: Bagaimana cara backup data?
**A:** Supabase melakukan automatic backup. Anda juga bisa export semua tabel ke Excel secara manual.

### Q: Apakah data aman?
**A:** Ya. Supabase menggunakan enkripsi HTTPS dan Row Level Security. Namun untuk production dengan data PII, gunakan Supabase project sendiri (bukan Figma Make shared environment).

### Q: Bisa multi-user?
**A:** Ya, tetapi authentication belum diimplementasikan. Saat ini semua user dianggap admin. Authentication akan ditambahkan di Phase 2.

---

## 🆘 Troubleshooting Cepat

| Problem | Solution |
|---------|----------|
| Tabel tidak muncul di Supabase | Jalankan ulang migration SQL script |
| Stok tidak terupdate | Cek apakah trigger sudah aktif di Supabase (Triggers section) |
| Export Excel error | Refresh page dan coba lagi |
| "Duplicate key" error | Kode produk atau NIB customer harus unique, gunakan kode lain |
| "Insufficient stock" | Qty barang keluar melebihi stok tersedia, kurangi qty |

---

## 📚 Resources

- **Database Schema:** `/database-schema.md`
- **User Guide Lengkap:** `/README-USER-GUIDE.md`
- **Migration SQL:** `/supabase/migrations/001_initial_schema.sql`
- **Supabase Docs:** https://supabase.com/docs

---

## 🎉 Selamat Mencoba!

Anda sekarang siap menggunakan Sistem Manajemen Distribusi Farmasi PT AOMA Prima Medika!

Jika ada pertanyaan, silakan hubungi tim development.

---

**Happy Coding! 🚀**
