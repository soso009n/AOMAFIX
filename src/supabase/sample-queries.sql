-- PT AOMA Prima Medika - Sample SQL Queries for Manual Operations
-- Use these queries in Supabase SQL Editor untuk operasi yang belum ada UI-nya

-- =====================================================
-- CREATE TRANSACTION MANUALLY (Since UI form not yet implemented)
-- =====================================================

-- Step 1: Insert transaction header
-- Replace the UUIDs with actual IDs from your customers and sales_teams tables
INSERT INTO transactions (
    customer_id,
    sales_id,
    dpl_name,
    discount_percent,
    transaction_date
) VALUES (
    (SELECT id FROM customers WHERE nama_outlet = 'RS Cipto Mangunkusumo' LIMIT 1),
    (SELECT id FROM sales_teams WHERE nama_sales = 'John Doe' LIMIT 1),
    'PT Distributor Utama',
    10.00,  -- 10% discount
    CURRENT_DATE
)
RETURNING id;  -- Save this ID for next step

-- Step 2: Insert transaction items
-- Replace <transaction_id> with the ID from Step 1
-- Replace <product_id> with actual product ID
INSERT INTO transaction_items (
    transaction_id,
    product_id,
    qty,
    expired_date,
    hna_at_moment,
    total_price_item
) VALUES
(
    '<transaction_id>',  -- From Step 1
    (SELECT id FROM products WHERE kode_produk = 'MED-001' LIMIT 1),
    50,  -- Quantity
    '2025-12-31',  -- Expired date
    (SELECT hna FROM products WHERE kode_produk = 'MED-001'),  -- HNA snapshot
    (SELECT hna * 50 FROM products WHERE kode_produk = 'MED-001')  -- Total (HNA × Qty)
),
(
    '<transaction_id>',
    (SELECT id FROM products WHERE kode_produk = 'MED-002' LIMIT 1),
    30,
    '2025-12-31',
    (SELECT hna FROM products WHERE kode_produk = 'MED-002'),
    (SELECT hna * 30 FROM products WHERE kode_produk = 'MED-002')
);

-- Step 3: Transaction total will be auto-calculated by trigger!
-- Check the result:
SELECT * FROM transactions WHERE id = '<transaction_id>';

-- =====================================================
-- COMPLETE EXAMPLE: Create Full Transaction in One Go
-- =====================================================

WITH new_transaction AS (
    INSERT INTO transactions (
        customer_id,
        sales_id,
        dpl_name,
        discount_percent,
        transaction_date
    ) VALUES (
        (SELECT id FROM customers LIMIT 1),
        (SELECT id FROM sales_teams LIMIT 1),
        'PT Distributor Utama',
        15.00,
        CURRENT_DATE
    )
    RETURNING id
),
inserted_items AS (
    INSERT INTO transaction_items (
        transaction_id,
        product_id,
        qty,
        expired_date,
        hna_at_moment,
        total_price_item
    )
    SELECT
        (SELECT id FROM new_transaction),
        p.id,
        20,  -- Qty
        '2025-12-31',
        p.hna,
        p.hna * 20
    FROM products p
    WHERE p.kode_produk = 'MED-001'
    RETURNING *
)
SELECT * FROM new_transaction;

-- =====================================================
-- USEFUL QUERIES FOR DATA MANAGEMENT
-- =====================================================

-- 1. View all transactions with customer and sales info
SELECT 
    t.id,
    t.invoice_number,
    c.nama_outlet as customer,
    s.nama_sales as sales,
    t.discount_percent,
    t.total_price_final,
    t.transaction_date
FROM transactions t
JOIN customers c ON t.customer_id = c.id
JOIN sales_teams s ON t.sales_id = s.id
ORDER BY t.transaction_date DESC;

-- 2. View transaction items with product details
SELECT 
    t.invoice_number,
    c.nama_outlet,
    p.nama_produk,
    p.kode_produk,
    ti.qty,
    ti.hna_at_moment,
    ti.total_price_item,
    ti.total_price_item * (1 - (t.discount_percent / 100)) as total_after_discount
FROM transaction_items ti
JOIN transactions t ON ti.transaction_id = t.id
JOIN products p ON ti.product_id = p.id
JOIN customers c ON t.customer_id = c.id
ORDER BY t.transaction_date DESC;

-- 3. View inventory movements with product details
SELECT 
    il.type,
    il.date_log,
    p.nama_produk,
    p.kode_produk,
    il.qty,
    il.batch_lot_number,
    il.doc_reference,
    il.branch_location,
    CASE 
        WHEN il.type = 'IN' THEN il.qty * p.hpp 
        ELSE 0 
    END as in_value,
    CASE 
        WHEN il.type = 'OUT' THEN il.qty * p.hpp 
        ELSE 0 
    END as out_value
FROM inventory_logs il
JOIN products p ON il.product_id = p.id
ORDER BY il.date_log DESC, il.created_at DESC;

-- 4. Check current stock levels
SELECT 
    kode_produk,
    nama_produk,
    nama_pabrik,
    current_stock,
    hpp,
    hna,
    current_stock * hpp as stock_value_hpp,
    current_stock * hna as stock_value_hna,
    CASE 
        WHEN current_stock < 10 THEN 'LOW STOCK'
        WHEN current_stock < 50 THEN 'MEDIUM'
        ELSE 'GOOD'
    END as stock_status
FROM products
ORDER BY current_stock ASC;

-- 5. Calculate margin per transaction
SELECT 
    t.id,
    t.invoice_number,
    c.nama_outlet,
    SUM(ti.total_price_item) as total_before_discount,
    t.total_price_final as total_after_discount,
    SUM(p.hpp * ti.qty) as total_hpp,
    t.total_price_final - SUM(p.hpp * ti.qty) as margin,
    ROUND(
        ((t.total_price_final - SUM(p.hpp * ti.qty)) / SUM(p.hpp * ti.qty) * 100)::numeric, 
        2
    ) as margin_percentage
FROM transactions t
JOIN transaction_items ti ON t.id = ti.transaction_id
JOIN products p ON ti.product_id = p.id
JOIN customers c ON t.customer_id = c.id
GROUP BY t.id, c.nama_outlet
ORDER BY t.transaction_date DESC;

-- =====================================================
-- UPDATE OPERATIONS
-- =====================================================

-- Update invoice number for a transaction
UPDATE transactions
SET invoice_number = 'INV/2024/001'
WHERE id = '<transaction_id>';

-- Update product prices
UPDATE products
SET hpp = 60000, hna = 85000
WHERE kode_produk = 'MED-001';

-- Update customer information
UPDATE customers
SET alamat = 'New Address Here',
    nama_penanggung_jawab = 'New PIC Name'
WHERE nomor_nib = '1234567890123';

-- =====================================================
-- DELETE OPERATIONS (Use with CAUTION!)
-- =====================================================

-- Delete a transaction (will also delete all transaction_items due to CASCADE)
DELETE FROM transactions WHERE id = '<transaction_id>';

-- Delete a product (will FAIL if it's referenced in transactions or inventory_logs)
DELETE FROM products WHERE kode_produk = 'TEST-999';

-- ⚠️ NEVER delete from inventory_logs - it's audit trail!
-- If you really need to, be very careful:
-- DELETE FROM inventory_logs WHERE id = '<log_id>';

-- =====================================================
-- REPORTING QUERIES
-- =====================================================

-- 1. Sales Report per Sales Person (Monthly)
SELECT 
    s.nama_sales,
    s.cabang,
    DATE_TRUNC('month', t.transaction_date) as month,
    COUNT(t.id) as total_transactions,
    SUM(t.total_price_final) as total_sales
FROM transactions t
JOIN sales_teams s ON t.sales_id = s.id
GROUP BY s.nama_sales, s.cabang, DATE_TRUNC('month', t.transaction_date)
ORDER BY month DESC, total_sales DESC;

-- 2. Top 10 Products by Sales Volume
SELECT 
    p.nama_produk,
    p.kode_produk,
    SUM(ti.qty) as total_qty_sold,
    SUM(ti.total_price_item) as total_revenue_before_discount
FROM transaction_items ti
JOIN products p ON ti.product_id = p.id
GROUP BY p.nama_produk, p.kode_produk
ORDER BY total_qty_sold DESC
LIMIT 10;

-- 3. Customer Purchase History
SELECT 
    c.nama_outlet,
    COUNT(t.id) as total_orders,
    SUM(t.total_price_final) as total_spent,
    MAX(t.transaction_date) as last_order_date
FROM customers c
LEFT JOIN transactions t ON c.id = t.customer_id
GROUP BY c.nama_outlet
ORDER BY total_spent DESC;

-- 4. Inventory Turnover (Movement Activity)
SELECT 
    p.nama_produk,
    p.kode_produk,
    SUM(CASE WHEN il.type = 'IN' THEN il.qty ELSE 0 END) as total_in,
    SUM(CASE WHEN il.type = 'OUT' THEN il.qty ELSE 0 END) as total_out,
    p.current_stock as current_stock,
    CASE 
        WHEN SUM(CASE WHEN il.type = 'OUT' THEN il.qty ELSE 0 END) > 0
        THEN ROUND(
            (p.current_stock::numeric / SUM(CASE WHEN il.type = 'OUT' THEN il.qty ELSE 0 END)), 
            2
        )
        ELSE NULL
    END as days_of_stock
FROM products p
LEFT JOIN inventory_logs il ON p.id = il.product_id
GROUP BY p.nama_produk, p.kode_produk, p.current_stock
ORDER BY days_of_stock ASC NULLS LAST;

-- =====================================================
-- MAINTENANCE QUERIES
-- =====================================================

-- 1. Reset sample data (WARNING: This deletes ALL data!)
TRUNCATE TABLE 
    inventory_logs, 
    transaction_items, 
    transactions, 
    products, 
    customers, 
    sales_teams 
CASCADE;

-- 2. Re-run sample data insertion (from migration file)
-- Copy the INSERT statements from 001_initial_schema.sql

-- 3. Check database statistics
SELECT 
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- 4. Verify triggers are active
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;

-- =====================================================
-- TROUBLESHOOTING QUERIES
-- =====================================================

-- 1. Find transactions without invoice numbers
SELECT 
    t.id,
    c.nama_outlet,
    s.nama_sales,
    t.transaction_date,
    t.total_price_final
FROM transactions t
JOIN customers c ON t.customer_id = c.id
JOIN sales_teams s ON t.sales_id = s.id
WHERE t.invoice_number IS NULL
ORDER BY t.transaction_date DESC;

-- 2. Find products with low stock
SELECT * FROM products
WHERE current_stock < 10
ORDER BY current_stock ASC;

-- 3. Find inventory movements without matching products
SELECT il.* FROM inventory_logs il
LEFT JOIN products p ON il.product_id = p.id
WHERE p.id IS NULL;

-- 4. Check for orphaned transaction items
SELECT ti.* FROM transaction_items ti
LEFT JOIN transactions t ON ti.transaction_id = t.id
WHERE t.id IS NULL;

-- =====================================================
-- NOTES
-- =====================================================
-- 
-- 1. Always test queries on sample data first!
-- 2. Use transactions (BEGIN; ... COMMIT;) for multi-step operations
-- 3. Backup data before running DELETE or TRUNCATE
-- 4. Monitor trigger performance on large datasets
-- 5. Use proper WHERE clauses to avoid full table scans
-- 
-- For more information, see:
-- - /database-schema.md
-- - /README-USER-GUIDE.md
-- 
-- =====================================================
