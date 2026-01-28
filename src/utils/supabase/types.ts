// PT AOMA Prima Medika - TypeScript Database Types
// Auto-generated types for Supabase database schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string
          nama_outlet: string
          alamat: string
          nomor_nib: string
          nama_penanggung_jawab: string
          npwp: string
          sipa: string
          idak_cdakb: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nama_outlet: string
          alamat: string
          nomor_nib: string
          nama_penanggung_jawab: string
          npwp: string
          sipa: string
          idak_cdakb?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nama_outlet?: string
          alamat?: string
          nomor_nib?: string
          nama_penanggung_jawab?: string
          npwp?: string
          sipa?: string
          idak_cdakb?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sales_teams: {
        Row: {
          id: string
          nama_sales: string
          cabang: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nama_sales: string
          cabang: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nama_sales?: string
          cabang?: string
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          nama_produk: string
          kode_produk: string
          nama_pabrik: string
          hpp: number
          hna: number
          current_stock: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nama_produk: string
          kode_produk: string
          nama_pabrik: string
          hpp: number
          hna: number
          current_stock?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nama_produk?: string
          kode_produk?: string
          nama_pabrik?: string
          hpp?: number
          hna?: number
          current_stock?: number
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          invoice_number: string | null
          customer_id: string
          sales_id: string
          dpl_name: string | null
          discount_percent: number
          transaction_date: string
          total_price_final: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invoice_number?: string | null
          customer_id: string
          sales_id: string
          dpl_name?: string | null
          discount_percent?: number
          transaction_date?: string
          total_price_final?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invoice_number?: string | null
          customer_id?: string
          sales_id?: string
          dpl_name?: string | null
          discount_percent?: number
          transaction_date?: string
          total_price_final?: number
          created_at?: string
          updated_at?: string
        }
      }
      transaction_items: {
        Row: {
          id: string
          transaction_id: string
          product_id: string
          qty: number
          expired_date: string
          hna_at_moment: number
          total_price_item: number
          created_at: string
        }
        Insert: {
          id?: string
          transaction_id: string
          product_id: string
          qty: number
          expired_date: string
          hna_at_moment: number
          total_price_item: number
          created_at?: string
        }
        Update: {
          id?: string
          transaction_id?: string
          product_id?: string
          qty?: number
          expired_date?: string
          hna_at_moment?: number
          total_price_item?: number
          created_at?: string
        }
      }
      inventory_logs: {
        Row: {
          id: string
          type: 'IN' | 'OUT'
          product_id: string
          qty: number
          batch_lot_number: string
          expired_date: string
          doc_reference: string
          date_log: string
          branch_location: string
          created_at: string
        }
        Insert: {
          id?: string
          type: 'IN' | 'OUT'
          product_id: string
          qty: number
          batch_lot_number: string
          expired_date: string
          doc_reference: string
          date_log?: string
          branch_location: string
          created_at?: string
        }
        Update: {
          id?: string
          type?: 'IN' | 'OUT'
          product_id?: string
          qty?: number
          batch_lot_number?: string
          expired_date?: string
          doc_reference?: string
          date_log?: string
          branch_location?: string
          created_at?: string
        }
      }
    }
    Views: {
      v_transaction_details: {
        Row: {
          transaction_id: string
          invoice_number: string | null
          customer_name: string
          customer_address: string
          nama_sales: string
          cabang: string
          dpl_name: string | null
          discount_percent: number
          transaction_date: string
          total_price_final: number
          created_at: string
        }
      }
      v_transaction_items_details: {
        Row: {
          item_id: string
          transaction_id: string
          invoice_number: string | null
          customer_name: string
          nama_produk: string
          kode_produk: string
          nama_pabrik: string
          qty: number
          expired_date: string
          hna_at_moment: number
          total_price_item: number
          discount_percent: number
          total_after_discount: number
          nama_sales: string
          cabang: string
          transaction_date: string
        }
      }
      v_inventory_status: {
        Row: {
          product_id: string
          nama_produk: string
          kode_produk: string
          nama_pabrik: string
          current_stock: number
          hpp: number
          hna: number
          stock_value_hpp: number
          stock_value_hna: number
        }
      }
      v_inventory_movements: {
        Row: {
          log_id: string
          type: 'IN' | 'OUT'
          date_log: string
          nama_produk: string
          kode_produk: string
          nama_pabrik: string
          qty: number
          batch_lot_number: string
          expired_date: string
          doc_reference: string
          branch_location: string
          in_value: number
          out_value: number
          created_at: string
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types for easier usage
export type Customer = Database['public']['Tables']['customers']['Row']
export type CustomerInsert = Database['public']['Tables']['customers']['Insert']
export type CustomerUpdate = Database['public']['Tables']['customers']['Update']

export type SalesTeam = Database['public']['Tables']['sales_teams']['Row']
export type SalesTeamInsert = Database['public']['Tables']['sales_teams']['Insert']
export type SalesTeamUpdate = Database['public']['Tables']['sales_teams']['Update']

export type Product = Database['public']['Tables']['products']['Row']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type ProductUpdate = Database['public']['Tables']['products']['Update']

export type Transaction = Database['public']['Tables']['transactions']['Row']
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update']

export type TransactionItem = Database['public']['Tables']['transaction_items']['Row']
export type TransactionItemInsert = Database['public']['Tables']['transaction_items']['Insert']
export type TransactionItemUpdate = Database['public']['Tables']['transaction_items']['Update']

export type InventoryLog = Database['public']['Tables']['inventory_logs']['Row']
export type InventoryLogInsert = Database['public']['Tables']['inventory_logs']['Insert']
export type InventoryLogUpdate = Database['public']['Tables']['inventory_logs']['Update']

// View types
export type TransactionDetail = Database['public']['Views']['v_transaction_details']['Row']
export type TransactionItemDetail = Database['public']['Views']['v_transaction_items_details']['Row']
export type InventoryStatus = Database['public']['Views']['v_inventory_status']['Row']
export type InventoryMovement = Database['public']['Views']['v_inventory_movements']['Row']

// Combined types for forms and displays
export interface TransactionWithDetails extends Transaction {
  customer?: Customer
  sales_team?: SalesTeam
  items?: TransactionItemWithProduct[]
}

export interface TransactionItemWithProduct extends TransactionItem {
  product?: Product
}

export interface InventoryLogWithProduct extends InventoryLog {
  product?: Product
}
