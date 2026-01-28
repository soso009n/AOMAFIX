# ⚡ QUICK START GUIDE - PT AOMA Prima Medika
## Panduan Cepat Penggunaan Sistem

---

## 🎯 5 LANGKAH MULAI MENGGUNAKAN SISTEM

### 1️⃣ **Setup Master Data** (Hanya Sekali)

#### A. Master Products
```
1. Klik menu "Master Products"
2. Klik tombol "+ Tambah Produk"
3. Isi form:
   - Nama Produk: "Paracetamol 500mg"
   - Kode Produk: "PAR-500" (harus unik)
   - Nama Pabrik: "Kimia Farma"
   - HPP: 5000
   - HNA: 7500
4. Klik "Simpan Produk"
```

#### B. Master Customers
```
1. Klik menu "Master Customers"
2. Klik tombol "+ Tambah Customer"
3. Isi form:
   - Nama Outlet: "RS Siloam Jakarta"
   - Alamat: "Jl. Sudirman No. 123, Jakarta"
   - Nomor NIB: "1234567890123" (harus unik)
   - Penanggung Jawab: "Dr. John Doe"
   - NPWP: "12.345.678.9-012.000"
   - SIPA: "SIPA/2024/001"
   - IDAK/CDAKB: "IDAK/2024/001" (opsional)
4. Klik "Simpan Customer"
```

#### C. Master Sales Teams
```
1. Klik menu "Master Sales Teams"
2. Klik tombol "+ Tambah Sales Team"
3. Isi form:
   - Nama Sales: "John Doe"
   - Cabang: "Jakarta Pusat"
4. Klik "Simpan Sales Team"
```

---

### 2️⃣ **Catat Barang Masuk dari Supplier**

```
1. Klik menu "Dashboard Gudang"
2. Tab "Barang Masuk"
3. Klik tombol "+ Tambah Barang Masuk"
4. Isi form:
   - Produk: Pilih "Paracetamol 500mg"
   - Qty: 1000
   - Batch Number: "BATCH-2024-001"
   - Expired Date: 2026-12-31
   - Supplier: "PT Kimia Farma"
   - Doc Reference: "PO-2024-001"
5. Klik "Simpan"
6. ✅ Stok otomatis bertambah +1000
```

---

### 3️⃣ **Buat Transaksi Penjualan**

```
1. Klik menu "Admin Sales"
2. Klik tombol "+ Buat Transaksi Baru"
3. Isi form header:
   - Customer: Pilih "RS Siloam Jakarta"
   - Sales Team: Pilih "John Doe - Jakarta Pusat"
   - DPL Name: "PT ABC" (opsional)
   - Tanggal Transaksi: 2026-01-28
   - Diskon %: 10
   - No Invoice: "INV/2024/001" (opsional, bisa diisi nanti)

4. Tambah Item Produk:
   - Klik "Tambah Item"
   - Produk: Pilih "Paracetamol 500mg"
   - Qty: 100
   - Expired Date: 2026-12-31
   - (Bisa tambah lebih banyak item)

5. Klik "Simpan Transaksi"
6. ✅ Transaksi tersimpan!
   Total = (100 × 7500) × (1 - 0.10) = Rp 675,000
```

---

### 4️⃣ **Catat Barang Keluar ke Customer**

```
1. Klik menu "Dashboard Gudang"
2. Tab "Barang Keluar"
3. Klik tombol "+ Tambah Barang Keluar"
4. Isi form:
   - Produk: Pilih "Paracetamol 500mg"
   - Qty: 100
   - Customer: "RS Siloam Jakarta"
   - Document Reference: "INV/2024/001"
5. Klik "Simpan"
6. ✅ Stok otomatis berkurang -100
7. Stok sekarang: 1000 - 100 = 900
```

---

### 5️⃣ **Monitoring & Export**

#### Cek Stok Real-time:
```
1. Dashboard Gudang → Tab "Inventory Level"
2. Lihat stok semua produk real-time
3. Alert merah jika stok < 10
4. Klik "Export Excel" untuk laporan
```

#### Lihat Detail Transaksi:
```
1. Admin Sales → Tabel "Ringkasan Transaksi"
2. Lihat grand total per transaksi
3. Klik "Export Excel" untuk laporan

4. Scroll ke "Detail Transaksi Per Item"
5. Lihat breakdown per item produk
6. Klik "Export Excel" untuk detail
```

---

## 🔄 WORKFLOW HARIAN

### Pagi (Setup Hari Ini):
```
1. Check Inventory Level → Lihat stok rendah
2. Buat list produk yang perlu re-order
3. Check pending transactions tanpa invoice
```

### Siang (Proses Transaksi):
```
1. Terima order dari sales
2. Buat transaksi di Admin Sales
3. Catat barang keluar di Dashboard Gudang
4. Isi invoice number
```

### Sore (Barang Masuk):
```
1. Terima barang dari supplier
2. Catat di Barang Masuk
3. Verify stok sudah update
```

### Malam (Reporting):
```
1. Export semua data ke Excel
2. Review transaksi hari ini
3. Check compliance (invoice sudah terisi)
```

---

## ✏️ EDIT DATA

### Edit Customer/Sales/Product:
```
1. Buka halaman master data yang sesuai
2. Klik icon ✏️ (Edit) di kolom Aksi
3. Modal form akan muncul dengan data existing
4. Ubah field yang diperlukan
5. Klik "Update" atau "Simpan"
```

### Edit Transaksi:
```
1. Admin Sales → Ringkasan Transaksi
2. Klik icon ✏️ (Edit)
3. Form dengan data existing muncul
4. Ubah customer, sales, diskon, atau items
5. Tambah/hapus item dengan tombol
6. Klik "Update Transaksi"
```

### Edit Invoice Number (Quick):
```
1. Admin Sales → Ringkasan Transaksi
2. Klik icon ✏️ kecil di samping invoice number
3. Ketik invoice baru
4. Klik ✅ untuk simpan
```

### Edit Barang Masuk/Keluar:
```
1. Dashboard Gudang → Barang Masuk/Keluar
2. Klik icon ✏️ (Edit)
3. Ubah qty atau field lain
4. Klik "Update"
5. ✅ Stok auto-adjust via trigger
```

---

## 🗑️ DELETE DATA

### ⚠️ PERHATIAN DELETE:

**✅ BISA DELETE:**
- Customer/Sales TANPA transaksi
- Product TANPA transaksi/inventory
- Barang Masuk/Keluar (jika stok cukup)
- Transaksi (akan hapus items juga)

**❌ TIDAK BISA DELETE:**
- Customer/Sales yang PUNYA transaksi
- Product yang PUNYA riwayat
- Barang Masuk jika stok tidak cukup

### Cara Delete:
```
1. Klik icon 🗑️ (Delete) di kolom Aksi
2. Dialog konfirmasi muncul
3. Baca warning message
4. Klik "Hapus" untuk konfirmasi
5. Atau "Batal" untuk membatalkan
```

---

## 📊 EXPORT TO EXCEL

### Export dari Semua Module:
```
1. Setiap tabel ada tombol "Export Excel"
2. Klik tombol → File .xlsx otomatis download
3. Buka dengan Excel/Google Sheets
```

### Available Exports:
- ✅ Inventory Level (stok semua produk)
- ✅ Barang Masuk (history incoming)
- ✅ Barang Keluar (history outgoing)
- ✅ Ringkasan Transaksi (per transaksi)
- ✅ Detail Items (per item produk)
- ✅ Master Products
- ✅ Master Customers
- ✅ Master Sales Teams

---

## 🔍 SEARCH & FILTER

### Cara Search:
```
1. Setiap tabel ada search box
2. Ketik keyword (nama, kode, dll)
3. Tabel otomatis filter
4. Clear search untuk lihat semua
```

### Cara Sort:
```
1. Klik header kolom tabel
2. Click sekali: Sort ASC (A→Z)
3. Click lagi: Sort DESC (Z→A)
4. Click lagi: Reset sort
```

---

## 🎨 DARK/LIGHT MODE

```
1. Klik icon 🌙/☀️ di header
2. Toggle antara dark/light mode
3. Preference tersimpan otomatis
```

---

## ⚡ KEYBOARD SHORTCUTS

```
Ctrl/Cmd + Click   → Open in new tab
Escape             → Close modal
Enter              → Submit form (dalam modal)
Tab                → Navigate form fields
```

---

## 🐛 TROUBLESHOOTING

### "NIB sudah terdaftar"
```
❌ Problem: Mencoba create customer dengan NIB yang sudah ada
✅ Solution: Gunakan NIB yang berbeda atau edit customer existing
```

### "Customer memiliki riwayat transaksi"
```
❌ Problem: Mencoba delete customer yang punya transaksi
✅ Solution: Tidak bisa delete. Pertimbangkan soft delete/archive
```

### "Stok tidak cukup"
```
❌ Problem: Mencoba buat barang keluar > stok available
✅ Solution: Check stok dulu. Atau reduce qty barang keluar
```

### "Tambahkan minimal 1 item"
```
❌ Problem: Submit transaksi tanpa item produk
✅ Solution: Klik "Tambah Item" dan pilih minimal 1 produk
```

### Stok tidak update
```
❌ Problem: Buat barang masuk/keluar tapi stok tidak berubah
✅ Solution: Check database triggers installed (Migration 002)
```

---

## 📱 TIPS & TRICKS

### 1. Batch Entry (Multi-item cepat)
```
Saat buat transaksi:
1. Klik "Tambah Item" berkali-kali dulu
2. Isi semua produk sekaligus
3. Lebih cepat daripada satu-satu
```

### 2. Copy Data dari Excel
```
1. Prepare data di Excel
2. Copy paste ke form (nama, qty, dll)
3. Lebih cepat untuk data entry massal
```

### 3. Filter dengan Search
```
Kombinasi search + sort:
1. Search "Paracetamol"
2. Sort by "Stock" (low to high)
3. Lihat Paracetamol mana yang stok rendah
```

### 4. Invoice Number Pattern
```
Gunakan format konsisten:
- INV/2024/001
- INV/2024/002
- dll
Mudah tracking dan sorting
```

### 5. Expired Date Monitoring
```
Sort transaksi by "Expired Date"
Lihat produk mana yang expirednya dekat
Prioritas untuk dijual dulu (FEFO)
```

---

## 📞 QUICK REFERENCE

### Navigation:
- Dashboard Gudang → Inventory management
- Admin Sales → Transaction management  
- Master Products → Product master data
- Master Customers → Customer master data
- Master Sales Teams → Sales team master data

### Tombol Umum:
- **+ Tambah** → Create new record
- **✏️ Edit** → Update existing record
- **🗑️ Delete** → Remove record
- **Export Excel** → Download to .xlsx

### Status Indicators:
- **Badge Hijau** → Active/Complete
- **Badge Merah** → Alert/Warning
- **Badge Biru** → Info
- **Badge Abu** → Inactive

---

## 🎯 CHEAT SHEET

| Aksi | Lokasi | Shortcut |
|------|--------|----------|
| Buat transaksi | Admin Sales | + Buat Transaksi Baru |
| Catat stok masuk | Dashboard Gudang → Barang Masuk | + Tambah |
| Catat stok keluar | Dashboard Gudang → Barang Keluar | + Tambah |
| Tambah customer | Master Customers | + Tambah Customer |
| Tambah sales | Master Sales Teams | + Tambah Sales Team |
| Tambah produk | Master Products | + Tambah Produk |
| Edit invoice | Admin Sales | Click ✏️ di invoice |
| Check stok | Dashboard Gudang → Inventory Level | View |
| Export laporan | Any table | Export Excel button |

---

## 💡 BEST PRACTICES

### 1. Consistency
```
✅ Gunakan format konsisten untuk:
   - Invoice number (INV/YYYY/XXX)
   - Batch number (BATCH-YYYY-XXX)
   - Document reference (PO-YYYY-XXX)
```

### 2. Regular Backup
```
✅ Export Excel secara berkala:
   - Harian: Transaksi hari ini
   - Mingguan: Inventory movement
   - Bulanan: Full data all tables
```

### 3. Data Validation
```
✅ Sebelum submit, pastikan:
   - NIB unique (customer)
   - Kode produk unique (products)
   - Qty > 0 dan realistic
   - Expired date future date
```

### 4. Stock Management
```
✅ Best practice:
   - Catat barang masuk SEGERA setelah terima
   - Catat barang keluar SETELAH kirim
   - Reconcile stok physical vs system
   - Monitor low stock alerts
```

### 5. Transaction Recording
```
✅ Workflow yang benar:
   1. Buat transaksi di Admin Sales (pencatatan)
   2. Catat barang keluar di Dashboard Gudang (stock)
   3. Isi invoice number
   4. Reference invoice di barang keluar
```

---

**🎉 Selamat menggunakan sistem PT AOMA Prima Medika!**

**Butuh bantuan lebih lanjut?**  
Lihat dokumentasi lengkap di:
- `/SYSTEM-COMPLETE-SUMMARY.md` - Overview lengkap
- `/MASTER-DATA-IMPLEMENTATION-GUIDE.md` - Master Data guide
- `/ADMIN-SALES-CRUD-GUIDE.md` - Admin Sales guide
- `/UPGRADE-CHANGELOG.md` - Version history

---

**Version: 2.2.0**  
**Last Updated: January 28, 2026**
