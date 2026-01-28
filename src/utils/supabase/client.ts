// PT AOMA Prima Medika - Supabase Client Configuration
// Singleton Supabase client for browser-side usage

import { createClient } from '@supabase/supabase-js';
// HAPUS baris ini (import info):
// import { projectId, publicAnonKey } from './info'; 
import type { Database } from './types';

// AMBIL dari .env menggunakan import.meta.env (Khusus Vite)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validasi agar tidak error senyap
if (!supabaseUrl || !supabaseKey) {
  throw new Error('⚠️ Supabase URL atau Anon Key hilang. Pastikan file .env sudah dibuat!');
}

// Create singleton Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'X-Client-Info': 'aoma-pharma-distribution-system',
    },
  },
});

// Helper function to handle Supabase errors
export function handleSupabaseError(error: any): string {
  if (!error) return 'Unknown error occurred';
  
  if (error.message) return error.message;
  if (error.error_description) return error.error_description;
  if (typeof error === 'string') return error;
  
  return JSON.stringify(error);
}

// Helper function to format currency (IDR)
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Helper function to format date
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

// Helper function to format date for input[type="date"]
export function formatDateForInput(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

// Calculate total price after discount
export function calculateDiscountedPrice(
  basePrice: number,
  discountPercent: number
): number {
  return basePrice * (1 - discountPercent / 100);
}

// Calculate margin (profit)
export function calculateMargin(hna: number, hpp: number, discountPercent: number = 0): number {
  const finalPrice = calculateDiscountedPrice(hna, discountPercent);
  return finalPrice - hpp;
}

// Calculate margin percentage
export function calculateMarginPercent(hna: number, hpp: number, discountPercent: number = 0): number {
  const margin = calculateMargin(hna, hpp, discountPercent);
  return (margin / hpp) * 100;
}

export default supabase;