Berikut **full SQL siap run di Supabase SQL Editor**. Script ini aman untuk project baru, memakai `CREATE TABLE IF NOT EXISTS`, membuat trigger ulang, mengaktifkan RLS, dan menambahkan seed data dengan `ON CONFLICT DO NOTHING`.

sql
-- =====================================================
-- PT AOMA Prima Medika - Full Supabase SQL Setup
-- Sistem Manajemen Distribusi Farmasi & Alat Kesehatan
-- Paste seluruh script ini ke Supabase SQL Editor lalu Run
-- =====================================================

BEGIN;

-- =====================================================
-- EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_outlet TEXT NOT NULL,
    alamat TEXT NOT NULL,
    nomor_nib VARCHAR(50) NOT NULL UNIQUE,
    nama_penanggung_jawab TEXT NOT NULL,
    npwp VARCHAR(50) NOT NULL,
    sipa VARCHAR(50) NOT NULL,
    idak_cdakb VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sales_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_sales TEXT NOT NULL,
    cabang VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_produk TEXT NOT NULL,
    kode_produk VARCHAR(50) NOT NULL UNIQUE,
    nama_pabrik TEXT NOT NULL,
    hpp NUMERIC(15,2) NOT NULL CHECK (hpp >= 0),
    hna NUMERIC(15,2) NOT NULL CHECK (hna >= 0),
    current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT products_hna_gte_hpp CHECK (hna >= hpp)
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(100),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    sales_id UUID NOT NULL REFERENCES public.sales_teams(id) ON DELETE RESTRICT,
    dpl_name TEXT,
    discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_price_final NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (total_price_final >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    qty INTEGER NOT NULL CHECK (qty > 0),
    batch_lot_number VARCHAR(100),
    expired_date DATE NOT NULL,
    hna_at_moment NUMERIC(15,2) NOT NULL CHECK (hna_at_moment >= 0),
    total_price_item NUMERIC(15,2) NOT NULL CHECK (total_price_item >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(10) NOT NULL CHECK (type IN ('IN', 'OUT')),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    qty INTEGER NOT NULL CHECK (qty > 0),
    batch_lot_number VARCHAR(100) NOT NULL,
    expired_date DATE NOT NULL,
    doc_reference TEXT NOT NULL,
    date_log DATE NOT NULL DEFAULT CURRENT_DATE,
    branch_location VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kv_store_4cc84954 (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
);

-- Support existing DB that may have older transaction_items schema
ALTER TABLE public.transaction_items
ADD COLUMN IF NOT EXISTS batch_lot_number VARCHAR(100);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_customers_nomor_nib ON public.customers(nomor_nib);
CREATE INDEX IF NOT EXISTS idx_customers_nama_outlet ON public.customers(nama_outlet);

CREATE INDEX IF NOT EXISTS idx_sales_cabang ON public.sales_teams(cabang);
CREATE INDEX IF NOT EXISTS idx_sales_nama_sales ON public.sales_teams(nama_sales);

CREATE INDEX IF NOT EXISTS idx_products_kode_produk ON public.products(kode_produk);
CREATE INDEX IF NOT EXISTS idx_products_nama_produk ON public.products(nama_produk);

CREATE INDEX IF NOT EXISTS idx_transactions_customer ON public.transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_sales ON public.transactions(sales_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice ON public.transactions(invoice_number);

CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction ON public.transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_product ON public.transaction_items(product_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_batch ON public.transaction_items(batch_lot_number);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_product ON public.inventory_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_type ON public.inventory_logs(type);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_date ON public.inventory_logs(date_log);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_batch ON public.inventory_logs(batch_lot_number);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_expired_date ON public.inventory_logs(expired_date);

-- =====================================================
-- FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_product_stock_on_inventory_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_current_stock INTEGER;
BEGIN
    SELECT current_stock INTO v_current_stock
    FROM public.products
    WHERE id = NEW.product_id
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
        RAISE EXCEPTION 'Product not found: %', NEW.product_id;
    END IF;

    IF NEW.type = 'IN' THEN
        UPDATE public.products
        SET current_stock = current_stock + NEW.qty,
            updated_at = NOW()
        WHERE id = NEW.product_id;
    ELSIF NEW.type = 'OUT' THEN
        IF v_current_stock < NEW.qty THEN
            RAISE EXCEPTION 'Insufficient stock for product_id %. Available stock: %, requested: %',
                NEW.product_id, v_current_stock, NEW.qty;
        END IF;

        UPDATE public.products
        SET current_stock = current_stock - NEW.qty,
            updated_at = NOW()
        WHERE id = NEW.product_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_inventory_log_update()
RETURNS TRIGGER AS $$
DECLARE
    v_current_stock INTEGER;
BEGIN
    -- Reverse OLD operation
    SELECT current_stock INTO v_current_stock
    FROM public.products
    WHERE id = OLD.product_id
    FOR UPDATE;

    IF OLD.type = 'IN' THEN
        IF v_current_stock < OLD.qty THEN
            RAISE EXCEPTION 'Cannot update log: reversing old IN would result in negative stock. Product: %, stock: %, old qty: %',
                OLD.product_id, v_current_stock, OLD.qty;
        END IF;

        UPDATE public.products
        SET current_stock = current_stock - OLD.qty,
            updated_at = NOW()
        WHERE id = OLD.product_id;
    ELSIF OLD.type = 'OUT' THEN
        UPDATE public.products
        SET current_stock = current_stock + OLD.qty,
            updated_at = NOW()
        WHERE id = OLD.product_id;
    END IF;

    -- Apply NEW operation
    SELECT current_stock INTO v_current_stock
    FROM public.products
    WHERE id = NEW.product_id
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
        RAISE EXCEPTION 'Product not found: %', NEW.product_id;
    END IF;

    IF NEW.type = 'IN' THEN
        UPDATE public.products
        SET current_stock = current_stock + NEW.qty,
            updated_at = NOW()
        WHERE id = NEW.product_id;
    ELSIF NEW.type = 'OUT' THEN
        IF v_current_stock < NEW.qty THEN
            RAISE EXCEPTION 'Insufficient stock for product_id %. Available stock: %, requested: %',
                NEW.product_id, v_current_stock, NEW.qty;
        END IF;

        UPDATE public.products
        SET current_stock = current_stock - NEW.qty,
            updated_at = NOW()
        WHERE id = NEW.product_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_inventory_log_delete()
RETURNS TRIGGER AS $$
DECLARE
    v_current_stock INTEGER;
BEGIN
    SELECT current_stock INTO v_current_stock
    FROM public.products
    WHERE id = OLD.product_id
    FOR UPDATE;

    IF OLD.type = 'IN' THEN
        IF v_current_stock < OLD.qty THEN
            RAISE EXCEPTION 'Cannot delete IN log: would result in negative stock. Product: %, stock: %, qty: %',
                OLD.product_id, v_current_stock, OLD.qty;
        END IF;

        UPDATE public.products
        SET current_stock = current_stock - OLD.qty,
            updated_at = NOW()
        WHERE id = OLD.product_id;
    ELSIF OLD.type = 'OUT' THEN
        UPDATE public.products
        SET current_stock = current_stock + OLD.qty,
            updated_at = NOW()
        WHERE id = OLD.product_id;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.calculate_transaction_total()
RETURNS TRIGGER AS $$
DECLARE
    v_transaction_id UUID;
    v_total NUMERIC(15,2);
    v_discount NUMERIC(5,2);
BEGIN
    v_transaction_id := COALESCE(NEW.transaction_id, OLD.transaction_id);

    SELECT discount_percent INTO v_discount
    FROM public.transactions
    WHERE id = v_transaction_id;

    SELECT COALESCE(SUM(total_price_item), 0) INTO v_total
    FROM public.transaction_items
    WHERE transaction_id = v_transaction_id;

    v_total := v_total * (1 - (COALESCE(v_discount, 0) / 100));

    UPDATE public.transactions
    SET total_price_final = v_total,
        updated_at = NOW()
    WHERE id = v_transaction_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.recalculate_transaction_on_discount_update()
RETURNS TRIGGER AS $$
DECLARE
    v_total NUMERIC(15,2);
BEGIN
    IF NEW.discount_percent IS DISTINCT FROM OLD.discount_percent THEN
        SELECT COALESCE(SUM(total_price_item), 0) INTO v_total
        FROM public.transaction_items
        WHERE transaction_id = NEW.id;

        NEW.total_price_final := v_total * (1 - (NEW.discount_percent / 100));
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Optional: automatically create OUT inventory logs from transaction items
-- Ini membantu stok berkurang saat transaksi sales dibuat/diubah.
CREATE OR REPLACE FUNCTION public.create_inventory_out_from_transaction_item()
RETURNS TRIGGER AS $$
DECLARE
    v_branch_location VARCHAR(100);
    v_invoice VARCHAR(100);
BEGIN
    SELECT st.cabang, COALESCE(t.invoice_number, 'TX-' || t.id::text)
    INTO v_branch_location, v_invoice
    FROM public.transactions t
    JOIN public.sales_teams st ON st.id = t.sales_id
    WHERE t.id = NEW.transaction_id;

    INSERT INTO public.inventory_logs (
        type,
        product_id,
        qty,
        batch_lot_number,
        expired_date,
        doc_reference,
        date_log,
        branch_location
    ) VALUES (
        'OUT',
        NEW.product_id,
        NEW.qty,
        COALESCE(NULLIF(NEW.batch_lot_number, ''), 'AUTO-' || NEW.id::text),
        NEW.expired_date,
        v_invoice,
        CURRENT_DATE,
        COALESCE(v_branch_location, 'Sales')
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.reverse_inventory_out_from_transaction_item_delete()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.inventory_logs
    WHERE type = 'OUT'
      AND product_id = OLD.product_id
      AND qty = OLD.qty
      AND expired_date = OLD.expired_date
      AND batch_lot_number = COALESCE(NULLIF(OLD.batch_lot_number, ''), 'AUTO-' || OLD.id::text)
      AND doc_reference IN (
          SELECT COALESCE(t.invoice_number, 'TX-' || t.id::text)
          FROM public.transactions t
          WHERE t.id = OLD.transaction_id
      )
      AND id = (
          SELECT id
          FROM public.inventory_logs
          WHERE type = 'OUT'
            AND product_id = OLD.product_id
            AND qty = OLD.qty
            AND expired_date = OLD.expired_date
            AND batch_lot_number = COALESCE(NULLIF(OLD.batch_lot_number, ''), 'AUTO-' || OLD.id::text)
            AND doc_reference IN (
                SELECT COALESCE(t.invoice_number, 'TX-' || t.id::text)
                FROM public.transactions t
                WHERE t.id = OLD.transaction_id
            )
          ORDER BY created_at DESC
          LIMIT 1
      );

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS trigger_customers_updated_at ON public.customers;
CREATE TRIGGER trigger_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_sales_teams_updated_at ON public.sales_teams;
CREATE TRIGGER trigger_sales_teams_updated_at
BEFORE UPDATE ON public.sales_teams
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_products_updated_at ON public.products;
CREATE TRIGGER trigger_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_transactions_updated_at ON public.transactions;

DROP TRIGGER IF EXISTS trigger_update_product_stock ON public.inventory_logs;
CREATE TRIGGER trigger_update_product_stock
BEFORE INSERT ON public.inventory_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_product_stock_on_inventory_insert();

DROP TRIGGER IF EXISTS trigger_handle_inventory_log_update ON public.inventory_logs;
CREATE TRIGGER trigger_handle_inventory_log_update
BEFORE UPDATE ON public.inventory_logs
FOR EACH ROW
EXECUTE FUNCTION public.handle_inventory_log_update();

DROP TRIGGER IF EXISTS trigger_handle_inventory_log_delete ON public.inventory_logs;
CREATE TRIGGER trigger_handle_inventory_log_delete
BEFORE DELETE ON public.inventory_logs
FOR EACH ROW
EXECUTE FUNCTION public.handle_inventory_log_delete();

DROP TRIGGER IF EXISTS trigger_calculate_transaction_total ON public.transaction_items;
CREATE TRIGGER trigger_calculate_transaction_total
AFTER INSERT OR UPDATE OR DELETE ON public.transaction_items
FOR EACH ROW
EXECUTE FUNCTION public.calculate_transaction_total();

DROP TRIGGER IF EXISTS trigger_recalculate_on_discount_update ON public.transactions;
CREATE TRIGGER trigger_recalculate_on_discount_update
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_transaction_on_discount_update();

DROP TRIGGER IF EXISTS trigger_create_inventory_out_from_transaction_item ON public.transaction_items;
CREATE TRIGGER trigger_create_inventory_out_from_transaction_item
AFTER INSERT ON public.transaction_items
FOR EACH ROW
EXECUTE FUNCTION public.create_inventory_out_from_transaction_item();

DROP TRIGGER IF EXISTS trigger_reverse_inventory_out_from_transaction_item_delete ON public.transaction_items;
CREATE TRIGGER trigger_reverse_inventory_out_from_transaction_item_delete
BEFORE DELETE ON public.transaction_items
FOR EACH ROW
EXECUTE FUNCTION public.reverse_inventory_out_from_transaction_item_delete();

-- =====================================================
-- VIEWS
-- =====================================================

CREATE OR REPLACE VIEW public.v_transaction_details AS
SELECT
    t.id AS transaction_id,
    t.invoice_number,
    c.nama_outlet AS customer_name,
    c.alamat AS customer_address,
    s.nama_sales,
    s.cabang,
    t.dpl_name,
    t.discount_percent,
    t.transaction_date,
    t.total_price_final,
    t.created_at
FROM public.transactions t
JOIN public.customers c ON c.id = t.customer_id
JOIN public.sales_teams s ON s.id = t.sales_id;

CREATE OR REPLACE VIEW public.v_transaction_items_details AS
SELECT
    ti.id AS item_id,
    ti.transaction_id,
    t.invoice_number,
    c.nama_outlet AS customer_name,
    p.nama_produk,
    p.kode_produk,
    p.nama_pabrik,
    ti.qty,
    ti.batch_lot_number,
    ti.expired_date,
    ti.hna_at_moment,
    ti.total_price_item,
    t.discount_percent,
    ti.total_price_item * (1 - (t.discount_percent / 100)) AS total_after_discount,
    s.nama_sales,
    s.cabang,
    t.transaction_date
FROM public.transaction_items ti
JOIN public.transactions t ON t.id = ti.transaction_id
JOIN public.customers c ON c.id = t.customer_id
JOIN public.sales_teams s ON s.id = t.sales_id
JOIN public.products p ON p.id = ti.product_id;

CREATE OR REPLACE VIEW public.v_inventory_status AS
SELECT
    p.id AS product_id,
    p.nama_produk,
    p.kode_produk,
    p.nama_pabrik,
    p.current_stock,
    p.hpp,
    p.hna,
    p.current_stock * p.hpp AS stock_value_hpp,
    p.current_stock * p.hna AS stock_value_hna
FROM public.products p;

CREATE OR REPLACE VIEW public.v_inventory_movements AS
SELECT
    il.id AS log_id,
    il.type,
    il.date_log,
    p.nama_produk,
    p.kode_produk,
    p.nama_pabrik,
    il.qty,
    il.batch_lot_number,
    il.expired_date,
    il.doc_reference,
    il.branch_location,
    CASE WHEN il.type = 'IN' THEN il.qty * p.hpp ELSE 0 END AS in_value,
    CASE WHEN il.type = 'OUT' THEN il.qty * p.hpp ELSE 0 END AS out_value,
    il.created_at
FROM public.inventory_logs il
JOIN public.products p ON p.id = il.product_id;

-- =====================================================
-- ROW LEVEL SECURITY
-- Development-friendly policies for anon/authenticated app access
-- Jika sudah production dengan auth, ubah policy ini menjadi lebih ketat.
-- =====================================================

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kv_store_4cc84954 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read customers" ON public.customers;
CREATE POLICY "Allow public read customers" ON public.customers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert customers" ON public.customers;
CREATE POLICY "Allow public insert customers" ON public.customers FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update customers" ON public.customers;
CREATE POLICY "Allow public update customers" ON public.customers FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public delete customers" ON public.customers;
CREATE POLICY "Allow public delete customers" ON public.customers FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read sales_teams" ON public.sales_teams;
CREATE POLICY "Allow public read sales_teams" ON public.sales_teams FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert sales_teams" ON public.sales_teams;
CREATE POLICY "Allow public insert sales_teams" ON public.sales_teams FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update sales_teams" ON public.sales_teams;
CREATE POLICY "Allow public update sales_teams" ON public.sales_teams FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public delete sales_teams" ON public.sales_teams;
CREATE POLICY "Allow public delete sales_teams" ON public.sales_teams FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read products" ON public.products;
CREATE POLICY "Allow public read products" ON public.products FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert products" ON public.products;
CREATE POLICY "Allow public insert products" ON public.products FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update products" ON public.products;
CREATE POLICY "Allow public update products" ON public.products FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public delete products" ON public.products;
CREATE POLICY "Allow public delete products" ON public.products FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read transactions" ON public.transactions;
CREATE POLICY "Allow public read transactions" ON public.transactions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert transactions" ON public.transactions;
CREATE POLICY "Allow public insert transactions" ON public.transactions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update transactions" ON public.transactions;
CREATE POLICY "Allow public update transactions" ON public.transactions FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public delete transactions" ON public.transactions;
CREATE POLICY "Allow public delete transactions" ON public.transactions FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read transaction_items" ON public.transaction_items;
CREATE POLICY "Allow public read transaction_items" ON public.transaction_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert transaction_items" ON public.transaction_items;
CREATE POLICY "Allow public insert transaction_items" ON public.transaction_items FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update transaction_items" ON public.transaction_items;
CREATE POLICY "Allow public update transaction_items" ON public.transaction_items FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public delete transaction_items" ON public.transaction_items;
CREATE POLICY "Allow public delete transaction_items" ON public.transaction_items FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read inventory_logs" ON public.inventory_logs;
CREATE POLICY "Allow public read inventory_logs" ON public.inventory_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert inventory_logs" ON public.inventory_logs;
CREATE POLICY "Allow public insert inventory_logs" ON public.inventory_logs FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update inventory_logs" ON public.inventory_logs;
CREATE POLICY "Allow public update inventory_logs" ON public.inventory_logs FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public delete inventory_logs" ON public.inventory_logs;
CREATE POLICY "Allow public delete inventory_logs" ON public.inventory_logs FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read kv_store" ON public.kv_store_4cc84954;
CREATE POLICY "Allow public read kv_store" ON public.kv_store_4cc84954 FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert kv_store" ON public.kv_store_4cc84954;
CREATE POLICY "Allow public insert kv_store" ON public.kv_store_4cc84954 FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update kv_store" ON public.kv_store_4cc84954;
CREATE POLICY "Allow public update kv_store" ON public.kv_store_4cc84954 FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public delete kv_store" ON public.kv_store_4cc84954;
CREATE POLICY "Allow public delete kv_store" ON public.kv_store_4cc84954 FOR DELETE USING (true);

-- =====================================================
-- SEED DATA AWAL
-- =====================================================

INSERT INTO public.customers (
    nama_outlet,
    alamat,
    nomor_nib,
    nama_penanggung_jawab,
    npwp,
    sipa,
    idak_cdakb
) VALUES
('RS Cipto Mangunkusumo', 'Jl. Diponegoro No.71, Jakarta Pusat', 'NIB-001-AOMA', 'dr. Andi Pratama', '01.234.567.8-901.000', 'SIPA-001-AOMA', 'IDAK-001-AOMA'),
('RS Siloam Kebon Jeruk', 'Jl. Perjuangan No.8, Jakarta Barat', 'NIB-002-AOMA', 'dr. Budi Santoso', '02.234.567.8-901.000', 'SIPA-002-AOMA', 'IDAK-002-AOMA'),
('Apotek Sehat Sentosa', 'Jl. Merdeka No.10, Bandung', 'NIB-003-AOMA', 'apt. Citra Lestari', '03.234.567.8-901.000', 'SIPA-003-AOMA', NULL)
ON CONFLICT (nomor_nib) DO NOTHING;

INSERT INTO public.sales_teams (nama_sales, cabang) VALUES
('John Doe', 'Jakarta'),
('Jane Smith', 'Bandung'),
('Ahmad Fauzi', 'Surabaya'),
('Siti Rahma', 'Semarang')
ON CONFLICT DO NOTHING;

INSERT INTO public.products (
    nama_produk,
    kode_produk,
    nama_pabrik,
    hpp,
    hna,
    current_stock
) VALUES
('Paracetamol 500mg Tablet', 'MED-001', 'PT Kimia Farma', 5000, 7500, 0),
('Amoxicillin 500mg Kapsul', 'MED-002', 'PT Kalbe Farma', 12000, 18000, 0),
('Masker Medis 3 Ply', 'ALK-001', 'PT OneMed', 25000, 35000, 0),
('Hand Sanitizer 500ml', 'ALK-002', 'PT Antiseptik Nusantara', 18000, 28000, 0),
('Vitamin C 1000mg', 'SUP-001', 'PT Dexa Medica', 30000, 45000, 0)
ON CONFLICT (kode_produk) DO NOTHING;

-- Seed stok awal via inventory_logs supaya current_stock tersinkron lewat trigger
INSERT INTO public.inventory_logs (
    type,
    product_id,
    qty,
    batch_lot_number,
    expired_date,
    doc_reference,
    date_log,
    branch_location
)
SELECT 'IN', p.id, seed.qty, seed.batch_lot_number, seed.expired_date::date, seed.doc_reference, CURRENT_DATE, seed.branch_location
FROM (
    VALUES
    ('MED-001', 120, 'LOT-MED001-001', '2027-12-31', 'PO-SEED-001', 'Jakarta'),
    ('MED-002', 80, 'LOT-MED002-001', '2027-10-31', 'PO-SEED-002', 'Jakarta'),
    ('ALK-001', 200, 'LOT-ALK001-001', '2028-01-31', 'PO-SEED-003', 'Bandung'),
    ('ALK-002', 100, 'LOT-ALK002-001', '2027-08-31', 'PO-SEED-004', 'Bandung'),
    ('SUP-001', 60, 'LOT-SUP001-001', '2027-06-30', 'PO-SEED-005', 'Surabaya')
) AS seed(kode_produk, qty, batch_lot_number, expired_date, doc_reference, branch_location)
JOIN public.products p ON p.kode_produk = seed.kode_produk
WHERE NOT EXISTS (
    SELECT 1
    FROM public.inventory_logs il
    WHERE il.product_id = p.id
      AND il.batch_lot_number = seed.batch_lot_number
      AND il.doc_reference = seed.doc_reference
);

COMMIT;

-- =====================================================
-- QUICK CHECK
-- =====================================================
SELECT 'customers' AS table_name, COUNT(*) AS total FROM public.customers
UNION ALL
SELECT 'sales_teams', COUNT(*) FROM public.sales_teams
UNION ALL
SELECT 'products', COUNT(*) FROM public.products
UNION ALL
SELECT 'inventory_logs', COUNT(*) FROM public.inventory_logs
UNION ALL
SELECT 'transactions', COUNT(*) FROM public.transactions
UNION ALL
SELECT 'transaction_items', COUNT(*) FROM public.transaction_items;


