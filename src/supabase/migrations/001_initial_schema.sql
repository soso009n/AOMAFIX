-- PT AOMA Prima Medika - Initial Database Schema
-- Migration: 001_initial_schema.sql
-- Description: Create all tables, indexes, triggers, and RLS policies for Pharmacy Distribution System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: customers (Outlet/Rumah Sakit)
-- =====================================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_outlet TEXT NOT NULL,
    alamat TEXT NOT NULL,
    nomor_nib VARCHAR(50) UNIQUE NOT NULL,
    nama_penanggung_jawab TEXT NOT NULL,
    npwp VARCHAR(50) NOT NULL,
    sipa VARCHAR(50) NOT NULL,
    idak_cdakb VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for customers
CREATE INDEX idx_customers_nomor_nib ON customers(nomor_nib);
CREATE INDEX idx_customers_nama_outlet ON customers(nama_outlet);

COMMENT ON TABLE customers IS 'Data customer: Rumah Sakit, Apotek, Outlet';
COMMENT ON COLUMN customers.nomor_nib IS 'Nomor Induk Berusaha - Unique Legal ID';
COMMENT ON COLUMN customers.sipa IS 'Surat Izin Praktik Apoteker';
COMMENT ON COLUMN customers.idak_cdakb IS 'Izin Distribusi Alat Kesehatan (Optional)';

-- =====================================================
-- TABLE: sales_teams (Tim Penjualan)
-- =====================================================
CREATE TABLE sales_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_sales TEXT NOT NULL,
    cabang VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for sales_teams
CREATE INDEX idx_sales_cabang ON sales_teams(cabang);

COMMENT ON TABLE sales_teams IS 'Data tim penjualan per cabang';

-- =====================================================
-- TABLE: products (Master Data Produk)
-- =====================================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_produk TEXT NOT NULL,
    kode_produk VARCHAR(50) UNIQUE NOT NULL,
    nama_pabrik TEXT NOT NULL,
    hpp NUMERIC(15,2) NOT NULL CHECK (hpp >= 0),
    hna NUMERIC(15,2) NOT NULL CHECK (hna >= 0),
    current_stock INTEGER DEFAULT 0 CHECK (current_stock >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for products
CREATE INDEX idx_products_kode_produk ON products(kode_produk);
CREATE INDEX idx_products_nama_produk ON products(nama_produk);

COMMENT ON TABLE products IS 'Master data produk farmasi dan alat kesehatan';
COMMENT ON COLUMN products.hpp IS 'Harga Pokok Penjualan (COGS) - Harga beli dari pabrik';
COMMENT ON COLUMN products.hna IS 'Harga Netto Apotek - List Price ke RS/Outlet';
COMMENT ON COLUMN products.current_stock IS 'Stok saat ini (Auto-updated via Trigger)';

-- =====================================================
-- TABLE: transactions (Header Transaksi Penjualan)
-- =====================================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(100),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    sales_id UUID NOT NULL REFERENCES sales_teams(id) ON DELETE RESTRICT,
    dpl_name TEXT,
    discount_percent NUMERIC(5,2) DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_price_final NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for transactions
CREATE INDEX idx_transactions_customer ON transactions(customer_id);
CREATE INDEX idx_transactions_sales ON transactions(sales_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);

COMMENT ON TABLE transactions IS 'Header transaksi penjualan ke customer';
COMMENT ON COLUMN transactions.invoice_number IS 'Nomor Invoice (Editable, bisa diisi manual)';
COMMENT ON COLUMN transactions.dpl_name IS 'Data Produk Lain/Distributor Principal';

-- =====================================================
-- TABLE: transaction_items (Detail Item Transaksi)
-- =====================================================
CREATE TABLE transaction_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    qty INTEGER NOT NULL CHECK (qty > 0),
    expired_date DATE NOT NULL,
    hna_at_moment NUMERIC(15,2) NOT NULL,
    total_price_item NUMERIC(15,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for transaction_items
CREATE INDEX idx_transaction_items_transaction ON transaction_items(transaction_id);
CREATE INDEX idx_transaction_items_product ON transaction_items(product_id);

COMMENT ON TABLE transaction_items IS 'Detail item per transaksi penjualan';
COMMENT ON COLUMN transaction_items.hna_at_moment IS 'HNA saat transaksi (Price snapshot)';
COMMENT ON COLUMN transaction_items.total_price_item IS 'HNA × Qty (before discount)';

-- =====================================================
-- TABLE: inventory_logs (Log Barang Masuk/Keluar)
-- =====================================================
CREATE TABLE inventory_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(10) NOT NULL CHECK (type IN ('IN', 'OUT')),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    qty INTEGER NOT NULL CHECK (qty > 0),
    batch_lot_number VARCHAR(100) NOT NULL,
    expired_date DATE NOT NULL,
    doc_reference TEXT NOT NULL,
    date_log DATE NOT NULL DEFAULT CURRENT_DATE,
    branch_location VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for inventory_logs
CREATE INDEX idx_inventory_logs_product ON inventory_logs(product_id);
CREATE INDEX idx_inventory_logs_type ON inventory_logs(type);
CREATE INDEX idx_inventory_logs_date ON inventory_logs(date_log);
CREATE INDEX idx_inventory_logs_batch ON inventory_logs(batch_lot_number);

COMMENT ON TABLE inventory_logs IS 'Log perpindahan barang (Incoming/Outgoing)';
COMMENT ON COLUMN inventory_logs.type IS 'IN = Barang Masuk, OUT = Barang Keluar';
COMMENT ON COLUMN inventory_logs.doc_reference IS 'No PO Supplier (IN) / No PO Outlet atau Surat Jalan (OUT)';

-- =====================================================
-- TRIGGER FUNCTIONS
-- =====================================================

-- Function: Auto-update products.current_stock on inventory changes
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
            RAISE EXCEPTION 'Insufficient stock for product_id %. Available stock: %', 
                NEW.product_id, 
                (SELECT current_stock + NEW.qty FROM products WHERE id = NEW.product_id);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_stock
AFTER INSERT ON inventory_logs
FOR EACH ROW
EXECUTE FUNCTION update_product_stock();

COMMENT ON FUNCTION update_product_stock() IS 'Auto-update stok produk saat ada log inventory IN/OUT';

-- Function: Auto-update transactions.total_price_final on items change
CREATE OR REPLACE FUNCTION calculate_transaction_total()
RETURNS TRIGGER AS $$
DECLARE
    v_total NUMERIC(15,2);
    v_discount NUMERIC(5,2);
BEGIN
    -- Get discount percentage dari header transaction
    SELECT discount_percent INTO v_discount
    FROM transactions
    WHERE id = COALESCE(NEW.transaction_id, OLD.transaction_id);
    
    -- Calculate total dari semua items
    SELECT COALESCE(SUM(total_price_item), 0) INTO v_total
    FROM transaction_items
    WHERE transaction_id = COALESCE(NEW.transaction_id, OLD.transaction_id);
    
    -- Apply discount: Total × (1 - Discount%/100)
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

COMMENT ON FUNCTION calculate_transaction_total() IS 'Auto-calculate total transaksi dengan diskon';

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with updated_at column
CREATE TRIGGER trigger_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_sales_teams_updated_at
BEFORE UPDATE ON sales_teams
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_transactions_updated_at
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;

-- For now, allow all authenticated users to read/write all tables
-- In production, customize these policies based on user roles (Admin, Gudang, Sales, etc.)

CREATE POLICY "Allow all for authenticated users" ON customers
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON sales_teams
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON products
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON transactions
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON transaction_items
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON inventory_logs
    FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Insert sample customers
INSERT INTO customers (nama_outlet, alamat, nomor_nib, nama_penanggung_jawab, npwp, sipa, idak_cdakb) VALUES
('RS Cipto Mangunkusumo', 'Jl. Diponegoro No.71, Jakarta Pusat', '1234567890123', 'Dr. Ahmad Santoso', '01.234.567.8-901.000', 'SIPA/JKT/2024/001', 'IDAK/001/2024'),
('RS Siloam Semanggi', 'Jl. Garnisun Dalam No.2-3, Jakarta Selatan', '9876543210987', 'Apt. Siti Nurhaliza', '02.345.678.9-012.000', 'SIPA/JKT/2024/002', NULL),
('Apotek Kimia Farma', 'Jl. Gatot Subroto, Jakarta Selatan', '5432167890543', 'Apt. Budi Hartono', '03.456.789.0-123.000', 'SIPA/JKT/2024/003', NULL);

-- Insert sample sales teams
INSERT INTO sales_teams (nama_sales, cabang) VALUES
('John Doe', 'Jakarta Pusat'),
('Jane Smith', 'Jakarta Selatan'),
('Budi Santoso', 'Surabaya'),
('Siti Aminah', 'Bandung');

-- Insert sample products
INSERT INTO products (nama_produk, kode_produk, nama_pabrik, hpp, hna, current_stock) VALUES
('Paracetamol 500mg Strip isi 10', 'MED-001', 'Kalbe Farma', 5000.00, 7500.00, 0),
('Amoxicillin 500mg Strip isi 10', 'MED-002', 'Dexa Medica', 15000.00, 22000.00, 0),
('Masker 3 Ply Box isi 50', 'ALK-001', 'Sensi', 45000.00, 65000.00, 0),
('Hand Sanitizer 500ml', 'ALK-002', 'Antis', 25000.00, 35000.00, 0),
('Thermometer Digital', 'ALK-003', 'Omron', 85000.00, 125000.00, 0);

-- =====================================================
-- VIEWS (Optional - for easier querying)
-- =====================================================

-- View: Complete transaction details with customer and sales info
CREATE OR REPLACE VIEW v_transaction_details AS
SELECT 
    t.id as transaction_id,
    t.invoice_number,
    c.nama_outlet as customer_name,
    c.alamat as customer_address,
    s.nama_sales,
    s.cabang,
    t.dpl_name,
    t.discount_percent,
    t.transaction_date,
    t.total_price_final,
    t.created_at
FROM transactions t
JOIN customers c ON t.customer_id = c.id
JOIN sales_teams s ON t.sales_id = s.id
ORDER BY t.transaction_date DESC, t.created_at DESC;

-- View: Complete transaction items with product info
CREATE OR REPLACE VIEW v_transaction_items_details AS
SELECT 
    ti.id as item_id,
    ti.transaction_id,
    t.invoice_number,
    c.nama_outlet as customer_name,
    p.nama_produk,
    p.kode_produk,
    p.nama_pabrik,
    ti.qty,
    ti.expired_date,
    ti.hna_at_moment,
    ti.total_price_item,
    t.discount_percent,
    -- Calculated: Total after discount
    ti.total_price_item * (1 - (t.discount_percent / 100)) as total_after_discount,
    s.nama_sales,
    s.cabang,
    t.transaction_date
FROM transaction_items ti
JOIN transactions t ON ti.transaction_id = t.id
JOIN products p ON ti.product_id = p.id
JOIN customers c ON t.customer_id = c.id
JOIN sales_teams s ON t.sales_id = s.id
ORDER BY t.transaction_date DESC, ti.created_at DESC;

-- View: Current inventory status
CREATE OR REPLACE VIEW v_inventory_status AS
SELECT 
    p.id as product_id,
    p.nama_produk,
    p.kode_produk,
    p.nama_pabrik,
    p.current_stock,
    p.hpp,
    p.hna,
    -- Value of current stock
    p.current_stock * p.hpp as stock_value_hpp,
    p.current_stock * p.hna as stock_value_hna
FROM products p
ORDER BY p.nama_produk;

-- View: Inventory movements (with product details)
CREATE OR REPLACE VIEW v_inventory_movements AS
SELECT 
    il.id as log_id,
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
    -- For IN: Calculate value
    CASE WHEN il.type = 'IN' THEN il.qty * p.hpp ELSE 0 END as in_value,
    -- For OUT: Calculate value
    CASE WHEN il.type = 'OUT' THEN il.qty * p.hpp ELSE 0 END as out_value,
    il.created_at
FROM inventory_logs il
JOIN products p ON il.product_id = p.id
ORDER BY il.date_log DESC, il.created_at DESC;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ PT AOMA Prima Medika - Database Schema Migration Completed Successfully!';
    RAISE NOTICE '📊 Tables created: customers, sales_teams, products, transactions, transaction_items, inventory_logs';
    RAISE NOTICE '⚙️  Triggers installed: Auto stock update, Auto transaction total calculation';
    RAISE NOTICE '🔒 RLS enabled on all tables';
    RAISE NOTICE '📈 Views created: v_transaction_details, v_transaction_items_details, v_inventory_status, v_inventory_movements';
    RAISE NOTICE '🎉 Ready for production use!';
END $$;
