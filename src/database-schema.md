# PT AOMA Prima Medika - Database Schema Documentation

## Overview
Sistem Manajemen Distribusi Farmasi & Alat Kesehatan dengan 6 tabel relasional yang saling berhubungan untuk mengelola:
- Data Customer (Rumah Sakit/Outlet)
- Tim Sales
- Master Data Produk
- Transaksi Penjualan
- Detail Transaksi
- Log Inventory (Barang Masuk/Keluar)

## Database Tables

### 1. customers (Data Outlet/Rumah Sakit)
Menyimpan informasi klien yang menjadi tujuan distribusi produk farmasi.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| nama_outlet | TEXT | NOT NULL | Nama Rumah Sakit/Apotek/Outlet |
| alamat | TEXT | NOT NULL | Alamat lengkap customer |
| nomor_nib | VARCHAR(50) | UNIQUE, NOT NULL | Nomor Induk Berusaha (Legal ID) |
| nama_penanggung_jawab | TEXT | NOT NULL | Nama PIC customer |
| npwp | VARCHAR(50) | NOT NULL | Nomor Pokok Wajib Pajak |
| sipa | VARCHAR(50) | NOT NULL | Surat Izin Praktik Apoteker |
| idak_cdakb | VARCHAR(50) | NULLABLE | Izin Distribusi Alat Kesehatan (Optional) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Timestamp creation |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Timestamp last update |

**Indexes:**
- `idx_customers_nomor_nib` on `nomor_nib` (UNIQUE)
- `idx_customers_nama_outlet` on `nama_outlet`

---

### 2. sales_teams (Data Tim Penjualan)
Menyimpan informasi personil sales yang menangani customer.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| nama_sales | TEXT | NOT NULL | Nama lengkap sales person |
| cabang | VARCHAR(100) | NOT NULL | Cabang/Area assignment (Jakarta, Surabaya, dll) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Timestamp creation |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Timestamp last update |

**Indexes:**
- `idx_sales_cabang` on `cabang`

---

### 3. products (Master Data Produk)
Master data produk farmasi dan alat kesehatan.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| nama_produk | TEXT | NOT NULL | Nama produk farmasi/alkes |
| kode_produk | VARCHAR(50) | UNIQUE, NOT NULL | Kode SKU produk |
| nama_pabrik | TEXT | NOT NULL | Nama manufacturer/pabrik |
| hpp | NUMERIC(15,2) | NOT NULL, CHECK (hpp >= 0) | Harga Pokok Penjualan (COGS) |
| hna | NUMERIC(15,2) | NOT NULL, CHECK (hna >= 0) | Harga Netto Apotek (List Price) |
| current_stock | INTEGER | DEFAULT 0, CHECK (current_stock >= 0) | Stok saat ini (Auto-updated via Trigger) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Timestamp creation |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Timestamp last update |

**Indexes:**
- `idx_products_kode_produk` on `kode_produk` (UNIQUE)
- `idx_products_nama_produk` on `nama_produk`

**Business Logic:**
- `HNA` harus >= `HPP` (List price tidak boleh lebih rendah dari COGS)
- `current_stock` akan di-update otomatis via Database Trigger saat ada transaksi di `inventory_logs`

---

### 4. transactions (Header Transaksi Penjualan)
Menyimpan header transaksi penjualan ke customer.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| invoice_number | VARCHAR(100) | NULLABLE | Nomor Invoice (Editable, bisa diisi manual) |
| customer_id | UUID | FOREIGN KEY REFERENCES customers(id) ON DELETE RESTRICT | ID Customer |
| sales_id | UUID | FOREIGN KEY REFERENCES sales_teams(id) ON DELETE RESTRICT | ID Sales |
| dpl_name | TEXT | NULLABLE | Data Produk Lain/Distributor Principal name |
| discount_percent | NUMERIC(5,2) | DEFAULT 0, CHECK (discount_percent >= 0 AND discount_percent <= 100) | Diskon (%) |
| transaction_date | DATE | NOT NULL, DEFAULT CURRENT_DATE | Tanggal transaksi |
| total_price_final | NUMERIC(15,2) | DEFAULT 0 | Total harga setelah diskon (Calculated) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Timestamp creation |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Timestamp last update |

**Indexes:**
- `idx_transactions_customer` on `customer_id`
- `idx_transactions_sales` on `sales_id`
- `idx_transactions_date` on `transaction_date`

**Relationships:**
- `customer_id` → `customers.id` (Many-to-One)
- `sales_id` → `sales_teams.id` (Many-to-One)

---

### 5. transaction_items (Detail Item Transaksi)
Menyimpan detail item per transaksi penjualan.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| transaction_id | UUID | FOREIGN KEY REFERENCES transactions(id) ON DELETE CASCADE | ID Transaction header |
| product_id | UUID | FOREIGN KEY REFERENCES products(id) ON DELETE RESTRICT | ID Produk |
| qty | INTEGER | NOT NULL, CHECK (qty > 0) | Jumlah unit |
| expired_date | DATE | NOT NULL | Tanggal expired produk |
| hna_at_moment | NUMERIC(15,2) | NOT NULL | HNA saat transaksi (Snapshot pricing) |
| total_price_item | NUMERIC(15,2) | NOT NULL | Total harga item (hna_at_moment * qty) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Timestamp creation |

**Indexes:**
- `idx_transaction_items_transaction` on `transaction_id`
- `idx_transaction_items_product` on `product_id`

**Relationships:**
- `transaction_id` → `transactions.id` (Many-to-One, CASCADE DELETE)
- `product_id` → `products.id` (Many-to-One)

**Business Logic:**
- `total_price_item` = `hna_at_moment` * `qty`
- Sum of all `total_price_item` (with discount applied) = `transactions.total_price_final`

---

### 6. inventory_logs (Log Barang Masuk/Keluar)
Menyimpan log perpindahan barang (Incoming/Outgoing) untuk tracking inventory.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| type | VARCHAR(10) | NOT NULL, CHECK (type IN ('IN', 'OUT')) | Tipe log: 'IN' = Masuk, 'OUT' = Keluar |
| product_id | UUID | FOREIGN KEY REFERENCES products(id) ON DELETE RESTRICT | ID Produk |
| qty | INTEGER | NOT NULL, CHECK (qty > 0) | Jumlah unit |
| batch_lot_number | VARCHAR(100) | NOT NULL | Nomor Lot/Batch produk |
| expired_date | DATE | NOT NULL | Tanggal expired produk |
| doc_reference | TEXT | NOT NULL | Ref: No PO Supplier (IN) / No PO Outlet (OUT) / No Surat Jalan |
| date_log | DATE | NOT NULL, DEFAULT CURRENT_DATE | Tanggal log masuk/keluar |
| branch_location | VARCHAR(100) | NOT NULL | Cabang asal/tujuan barang |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Timestamp creation |

**Indexes:**
- `idx_inventory_logs_product` on `product_id`
- `idx_inventory_logs_type` on `type`
- `idx_inventory_logs_date` on `date_log`
- `idx_inventory_logs_batch` on `batch_lot_number`

**Relationships:**
- `product_id` → `products.id` (Many-to-One)

**Business Logic (FIFO/FEFO via Trigger):**
- Saat `type = 'IN'` inserted → `products.current_stock` += `qty`
- Saat `type = 'OUT'` inserted → `products.current_stock` -= `qty`
- Implementasi FIFO (First In First Out) atau FEFO (First Expired First Out) untuk pengurangan stok

---

## Database Triggers & Functions

### Trigger: update_product_stock_on_inventory_log
**Purpose:** Auto-update `products.current_stock` saat ada insert di `inventory_logs`.

```sql
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'IN' THEN
        -- Barang Masuk: Tambah stok
        UPDATE products 
        SET current_stock = current_stock + NEW.qty,
            updated_at = NOW()
        WHERE id = NEW.product_id;
    ELSIF NEW.type = 'OUT' THEN
        -- Barang Keluar: Kurangi stok
        UPDATE products 
        SET current_stock = current_stock - NEW.qty,
            updated_at = NOW()
        WHERE id = NEW.product_id;
        
        -- Validasi: Stok tidak boleh negatif
        IF (SELECT current_stock FROM products WHERE id = NEW.product_id) < 0 THEN
            RAISE EXCEPTION 'Insufficient stock for product_id %', NEW.product_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_stock
AFTER INSERT ON inventory_logs
FOR EACH ROW
EXECUTE FUNCTION update_product_stock();
```

### Trigger: update_transaction_total_on_items_change
**Purpose:** Auto-update `transactions.total_price_final` saat ada perubahan di `transaction_items`.

```sql
CREATE OR REPLACE FUNCTION calculate_transaction_total()
RETURNS TRIGGER AS $$
DECLARE
    v_total NUMERIC(15,2);
    v_discount NUMERIC(5,2);
BEGIN
    -- Get discount percentage
    SELECT discount_percent INTO v_discount
    FROM transactions
    WHERE id = COALESCE(NEW.transaction_id, OLD.transaction_id);
    
    -- Calculate total from all items
    SELECT COALESCE(SUM(total_price_item), 0) INTO v_total
    FROM transaction_items
    WHERE transaction_id = COALESCE(NEW.transaction_id, OLD.transaction_id);
    
    -- Apply discount
    v_total := v_total * (1 - (v_discount / 100));
    
    -- Update transaction total
    UPDATE transactions
    SET total_price_final = v_total,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.transaction_id, OLD.transaction_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_transaction_total
AFTER INSERT OR UPDATE OR DELETE ON transaction_items
FOR EACH ROW
EXECUTE FUNCTION calculate_transaction_total();
```

---

## Data Relationships Diagram

```
customers (1) ←──────── (*) transactions (*) ────────→ (1) sales_teams
                              ↓
                              │ (1:N)
                              ↓
                        transaction_items (*) ────────→ (1) products
                                                          ↓
                                                          │ (1:N)
                                                          ↓
                                                    inventory_logs (*)
```

---

## Key Business Rules

1. **Kalkulasi Harga:**
   - Total Item = `HNA × Qty`
   - Total Setelah Diskon = `Total Item × (1 - Discount%/100)`
   - Grand Total Transaction = `SUM(All Items) × (1 - Discount%/100)`

2. **Validasi Stok:**
   - Barang keluar tidak boleh melebihi `current_stock`
   - Stok harus selalu >= 0

3. **FIFO/FEFO Logic:**
   - Implementasi via query: Sort by `expired_date ASC` untuk FEFO
   - Sort by `date_log ASC` untuk FIFO

4. **Margin Calculation:**
   - Margin = `(HNA - Discount) - HPP`
   - Margin % = `((HNA - Discount) - HPP) / HPP × 100%`

5. **Unique Constraints:**
   - `customers.nomor_nib` harus unique (Legal requirement)
   - `products.kode_produk` harus unique (SKU system)

---

## Migration SQL Script Location
See: `/supabase/migrations/001_initial_schema.sql` for complete SQL script.

---

**Last Updated:** 2026-01-28  
**Version:** 1.0.0  
**Author:** PT AOMA Prima Medika Development Team
