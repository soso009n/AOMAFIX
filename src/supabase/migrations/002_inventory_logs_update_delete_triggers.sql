-- PT AOMA Prima Medika - Migration 002: Enhanced Inventory Logs & Transaction Management
-- Description: Add triggers for handling UPDATE and DELETE on inventory_logs to maintain stock consistency

-- =====================================================
-- ENHANCED TRIGGER: Handle inventory_logs UPDATE
-- =====================================================

CREATE OR REPLACE FUNCTION handle_inventory_log_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Reverse the old operation
    IF OLD.type = 'IN' THEN
        -- Old was IN, so subtract the old qty
        UPDATE products 
        SET current_stock = current_stock - OLD.qty,
            updated_at = NOW()
        WHERE id = OLD.product_id;
    ELSIF OLD.type = 'OUT' THEN
        -- Old was OUT, so add back the old qty
        UPDATE products 
        SET current_stock = current_stock + OLD.qty,
            updated_at = NOW()
        WHERE id = OLD.product_id;
    END IF;
    
    -- Apply the new operation
    IF NEW.type = 'IN' THEN
        -- New is IN, so add the new qty
        UPDATE products 
        SET current_stock = current_stock + NEW.qty,
            updated_at = NOW()
        WHERE id = NEW.product_id;
    ELSIF NEW.type = 'OUT' THEN
        -- New is OUT, so subtract the new qty
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

CREATE TRIGGER trigger_handle_inventory_log_update
BEFORE UPDATE ON inventory_logs
FOR EACH ROW
EXECUTE FUNCTION handle_inventory_log_update();

COMMENT ON FUNCTION handle_inventory_log_update() IS 'Handle inventory stock updates when log is edited';

-- =====================================================
-- ENHANCED TRIGGER: Handle inventory_logs DELETE
-- =====================================================

CREATE OR REPLACE FUNCTION handle_inventory_log_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Reverse the operation that was logged
    IF OLD.type = 'IN' THEN
        -- Was IN, so subtract the qty back
        UPDATE products 
        SET current_stock = current_stock - OLD.qty,
            updated_at = NOW()
        WHERE id = OLD.product_id;
        
        -- Validasi: Stok tidak boleh negatif setelah delete
        IF (SELECT current_stock FROM products WHERE id = OLD.product_id) < 0 THEN
            RAISE EXCEPTION 'Cannot delete this log: would result in negative stock for product_id %. Current stock would be: %', 
                OLD.product_id, 
                (SELECT current_stock FROM products WHERE id = OLD.product_id);
        END IF;
    ELSIF OLD.type = 'OUT' THEN
        -- Was OUT, so add the qty back
        UPDATE products 
        SET current_stock = current_stock + OLD.qty,
            updated_at = NOW()
        WHERE id = OLD.product_id;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_handle_inventory_log_delete
BEFORE DELETE ON inventory_logs
FOR EACH ROW
EXECUTE FUNCTION handle_inventory_log_delete();

COMMENT ON FUNCTION handle_inventory_log_delete() IS 'Reverse stock changes when log is deleted';

-- =====================================================
-- FUNCTION: Recalculate transaction total when discount changes
-- =====================================================

CREATE OR REPLACE FUNCTION recalculate_transaction_on_discount_update()
RETURNS TRIGGER AS $$
DECLARE
    v_total NUMERIC(15,2);
BEGIN
    -- Only recalculate if discount changed
    IF NEW.discount_percent IS DISTINCT FROM OLD.discount_percent THEN
        -- Calculate total from all items
        SELECT COALESCE(SUM(total_price_item), 0) INTO v_total
        FROM transaction_items
        WHERE transaction_id = NEW.id;
        
        -- Apply discount: Total × (1 - Discount%/100)
        v_total := v_total * (1 - (NEW.discount_percent / 100));
        
        -- Update transaction total
        NEW.total_price_final := v_total;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recalculate_on_discount_update
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION recalculate_transaction_on_discount_update();

COMMENT ON FUNCTION recalculate_transaction_on_discount_update() IS 'Auto-recalculate total when discount percentage changes';

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 002 Completed Successfully!';
    RAISE NOTICE '📊 Enhanced triggers installed:';
    RAISE NOTICE '   - handle_inventory_log_update (for editing inventory logs)';
    RAISE NOTICE '   - handle_inventory_log_delete (for deleting inventory logs)';
    RAISE NOTICE '   - recalculate_transaction_on_discount_update (for transaction discount changes)';
    RAISE NOTICE '🔒 Stock consistency is now maintained on UPDATE and DELETE operations';
    RAISE NOTICE '🎉 Ready for production CRUD operations!';
END $$;
