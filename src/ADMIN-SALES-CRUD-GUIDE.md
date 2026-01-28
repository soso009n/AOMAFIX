# 🎯 Admin Sales Page - FULL CRUD Guide

## 📋 Overview

Admin Sales Page kini memiliki **FULL CRUD Operations** untuk:
1. **Ringkasan Transaksi** (Transaction Header)
2. **Detail Transaksi Per Item** (Transaction Items)

---

## ✨ Fitur Lengkap

### 1. CREATE - Buat Transaksi Baru

**Cara Pakai:**
1. Klik tombol **"Buat Transaksi Baru"** di pojok kanan atas
2. Isi form header transaksi:
   - **Customer/Outlet** (wajib) - Pilih dari dropdown
   - **Sales Team** (wajib) - Pilih sales dan cabangnya
   - **DPL Name** (opsional) - Nama distributor
   - **Tanggal Transaksi** (wajib) - Default hari ini
   - **Diskon %** (opsional) - Default 0%
   - **No Invoice** (opsional) - Bisa diisi nanti

3. Tambah Item Produk:
   - Klik **"Tambah Item"**
   - Pilih **Produk** dari dropdown (HNA otomatis muncul)
   - Isi **Qty** (jumlah)
   - Isi **Expired Date**
   - Bisa tambah multiple items
   - Klik icon 🗑️ untuk hapus item

4. Klik **"Simpan Transaksi"**

**Business Logic:**
- Minimal 1 item produk harus ada
- Total otomatis dihitung: `SUM(Qty × HNA) × (1 - Diskon%/100)`
- HNA disimpan sebagai snapshot (`hna_at_moment`) untuk audit trail
- Transaction items auto-cascade saat transaction dibuat

---

### 2. EDIT - Edit Transaksi & Items

**Cara Pakai:**
1. Di tabel Ringkasan Transaksi, klik icon ✏️ **Edit** di kolom Aksi
2. Form akan muncul dengan data existing:
   - Edit customer, sales, diskon, tanggal, dll
   - Lihat list items yang ada
   - Tambah item baru dengan "Tambah Item"
   - Hapus item lama dengan icon 🗑️
   - Qty dan expired date bisa diubah

3. Klik **"Update Transaksi"**

**Business Logic:**
- Saat update, semua items lama **dihapus** dan diganti dengan items baru
- Total otomatis recalculate
- Trigger database akan update `total_price_final`
- Perubahan discount % otomatis recalculate total

**⚠️ IMPORTANT:** 
- Edit transaction **TIDAK** mempengaruhi inventory logs
- Transaction hanya untuk pencatatan penjualan
- Stock management dilakukan via Dashboard Gudang (Inventory Logs)

---

### 3. DELETE - Hapus Transaksi

**Cara Pakai:**
1. Di tabel Ringkasan Transaksi, klik icon 🗑️ **Delete** di kolom Aksi
2. Dialog konfirmasi akan muncul dengan detail:
   - Invoice Number
   - Customer
   - Total Items
   - Grand Total
3. Klik **"Hapus Transaksi"** untuk konfirmasi

**Business Logic:**
- Delete transaction akan **CASCADE DELETE** semua items
- Configured di database schema: `ON DELETE CASCADE`
- Tidak dapat di-undo (permanent delete)

---

### 4. EDIT INVOICE NUMBER (Inline)

**Cara Pakai:**
1. Di tabel Ringkasan Transaksi, klik icon ✏️ kecil di samping No Invoice
2. Input field akan muncul
3. Ketik invoice number baru (contoh: `INV/2024/001`)
4. Klik ✅ untuk simpan, atau ❌ untuk batal

**Use Case:**
- Invoice number bisa diisi nanti setelah transaksi dibuat
- Update invoice tanpa perlu edit full transaction
- Quick edit untuk administrative purposes

---

## 🎨 UI/UX Features

### Summary Cards
- **Total Transaksi**: Jumlah semua transaksi
- **Total Revenue**: Total penjualan setelah diskon
- **Pending Invoice**: Transaksi yang belum ada invoice number
- **Transaksi Hari Ini**: Transaksi baru hari ini

### Table Features
- ✅ **Sortable columns** - Klik header untuk sort
- ✅ **Search/Filter** - Cari berdasarkan keyword
- ✅ **Export Excel** - Export data ke .xlsx
- ✅ **Loading states** - Indicator saat loading
- ✅ **Pagination** - Auto-pagination untuk data banyak

### Form Features
- ✅ **Dynamic items** - Tambah/hapus items sesuka hati
- ✅ **Auto-calculation** - Total otomatis dihitung
- ✅ **Validation** - Required fields & format validation
- ✅ **Dropdown with search** - Easy product selection
- ✅ **Date picker** - Calendar UI untuk tanggal
- ✅ **Real-time preview** - HNA muncul di dropdown produk

---

## 📊 Data Flow

### CREATE Transaction Flow:
```
1. User fills form header (customer, sales, discount, date)
2. User adds items (product, qty, expired_date)
3. On submit:
   a. INSERT transaction header → get transaction_id
   b. For each item:
      - Get HNA from products table
      - Calculate total_price_item = qty × HNA
      - INSERT transaction_item
   c. Trigger auto-calculates total_price_final:
      - SUM all items total_price_item
      - Apply discount: total × (1 - discount%/100)
4. Success toast & reload data
```

### EDIT Transaction Flow:
```
1. Load existing transaction + items
2. User modifies header and/or items
3. On submit:
   a. UPDATE transaction header
   b. DELETE all old transaction_items
   c. INSERT new transaction_items
   d. Trigger recalculates total_price_final
4. Success toast & reload data
```

### DELETE Transaction Flow:
```
1. User clicks delete icon
2. Show confirmation dialog with transaction details
3. On confirm:
   a. DELETE transaction (cascade deletes items automatically)
4. Success toast & reload data
```

---

## 🔧 Technical Details

### Key Components:
- **admin-sales-page-enhanced.tsx** - Main component with FULL CRUD
- **Dialog** - For create/edit modals (scrollable, max-height: 90vh)
- **AlertDialog** - For delete confirmation
- **DataTable** - Reusable table with sort/search/export

### State Management:
```typescript
const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
const [customers, setCustomers] = useState<Customer[]>([]);
const [salesTeams, setSalesTeams] = useState<SalesTeam[]>([]);
const [products, setProducts] = useState<Product[]>([]);
const [transactionItems, setTransactionItems] = useState<TransactionItemFormData[]>([]);
```

### Form Validation:
- Customer & Sales: **Required** (via Select required prop)
- Transaction Date: **Required** (via Input required prop)
- Items: **Minimum 1 item** (validated in submit handler)
- Product: **Required** per item
- Qty: **Required**, min 1
- Expired Date: **Required**

---

## 📝 Database Schema Reference

### `transactions` Table:
```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(100),                    -- Editable
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    sales_id UUID NOT NULL REFERENCES sales_teams(id) ON DELETE RESTRICT,
    dpl_name TEXT,
    discount_percent NUMERIC(5,2) DEFAULT 0,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_price_final NUMERIC(15,2) DEFAULT 0,      -- Auto-calculated
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `transaction_items` Table:
```sql
CREATE TABLE transaction_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE, -- ⚠️ CASCADE!
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    qty INTEGER NOT NULL CHECK (qty > 0),
    expired_date DATE NOT NULL,
    hna_at_moment NUMERIC(15,2) NOT NULL,           -- Snapshot of HNA
    total_price_item NUMERIC(15,2) NOT NULL,        -- qty × hna_at_moment
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Database Triggers:
1. **calculate_transaction_total()** - Auto-calculate total saat items berubah
2. **recalculate_transaction_on_discount_update()** - Recalc saat discount berubah
3. **update_updated_at_column()** - Auto-update timestamp

---

## 🧪 Testing Scenarios

### Test CREATE:
1. ✅ Create transaction dengan 1 item → Check total calculated correctly
2. ✅ Create transaction dengan multiple items → Check SUM correct
3. ✅ Create transaction dengan diskon 10% → Check discount applied
4. ✅ Create transaction tanpa invoice number → Should success (optional field)
5. ✅ Try create tanpa items → Should show error "Tambahkan minimal 1 item"

### Test EDIT:
1. ✅ Edit customer/sales → Check updated correctly
2. ✅ Edit discount dari 0% ke 10% → Check total recalculated
3. ✅ Add new item to existing transaction → Check total increased
4. ✅ Remove item from transaction → Check total decreased
5. ✅ Change qty of item → Check total updated

### Test DELETE:
1. ✅ Delete transaction → Check items deleted too (cascade)
2. ✅ Delete transaction dengan invoice → Should still delete
3. ✅ Cancel delete → Should not delete anything

### Test INLINE INVOICE EDIT:
1. ✅ Edit invoice from empty → Should update
2. ✅ Edit invoice from existing → Should update
3. ✅ Cancel edit → Should not update

---

## 🚨 Important Notes

### ⚠️ Stock Management
**CRITICAL:** Transaction CREATE/EDIT/DELETE **TIDAK** mempengaruhi inventory stock!

**Why?**
- Transactions hanya untuk **pencatatan penjualan** ke customer
- Stock management dilakukan via **Dashboard Gudang → Barang Keluar**
- Pisahkan concerns: Sales (Admin Sales) vs Warehouse (Dashboard Gudang)

**Workflow Lengkap:**
1. **Dashboard Gudang** → Catat barang masuk dari supplier (stock +)
2. **Admin Sales** → Buat transaksi penjualan (pencatatan saja)
3. **Dashboard Gudang** → Catat barang keluar ke customer (stock -)

### 🔐 Data Integrity
- Transaction → Customer: `ON DELETE RESTRICT` (cannot delete customer with transactions)
- Transaction → Sales: `ON DELETE RESTRICT` (cannot delete sales with transactions)
- Transaction → Items: `ON DELETE CASCADE` (delete transaction = delete items)
- Items → Product: `ON DELETE RESTRICT` (cannot delete product with transaction history)

### 💡 Business Rules
1. **Invoice Number** is optional during creation (can be filled later)
2. **Discount** applies to total transaction, not per item
3. **HNA snapshot** (`hna_at_moment`) preserves historical pricing
4. **Expired Date** per item for FEFO (First Expired First Out) management
5. **DPL Name** optional field for distributor principal tracking

---

## 📞 Support

### Files Reference:
- `/components/admin-sales-page-enhanced.tsx` - Full CRUD implementation
- `/utils/supabase/types.ts` - TypeScript types
- `/database-schema.md` - Complete DB schema
- `/supabase/migrations/001_initial_schema.sql` - Initial migration
- `/supabase/migrations/002_inventory_logs_update_delete_triggers.sql` - Enhanced triggers

### Common Issues:
**Q: Total tidak otomatis update?**
A: Check database triggers installed. Run migration 001 and 002.

**Q: Error "Cannot delete transaction"?**
A: Check foreign key constraints. Ensure cascade delete configured.

**Q: Items tidak muncul saat edit?**
A: Check transaction_items table. Verify transaction_id foreign key correct.

**Q: Discount tidak apply?**
A: Check trigger `recalculate_transaction_on_discount_update` installed.

---

**🎉 Admin Sales Page is now production-ready with FULL CRUD operations!**

**Next Features (Phase 3):**
- Master Customers CRUD
- Master Sales Teams CRUD
- Advanced reporting & analytics
- Batch operations
