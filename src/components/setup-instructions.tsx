// PT AOMA Prima Medika - Setup Instructions Component
// Displays instructions for first-time users to setup database

'use client';

import { useState } from 'react';
import { AlertCircle, Database, CheckCircle, ExternalLink, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface SetupInstructionsProps {
  onClose: () => void;
}

export function SetupInstructions({ onClose }: SetupInstructionsProps) {
  const [step, setStep] = useState(1);

  const steps = [
    {
      title: 'Buka Supabase SQL Editor',
      description: 'Login ke Supabase Dashboard dan buka SQL Editor',
      instructions: [
        'Login ke Supabase Dashboard (https://supabase.com/dashboard)',
        'Pilih project Anda yang terhubung dengan aplikasi ini',
        'Di sidebar kiri, klik "SQL Editor"',
        'Klik tombol "+ New Query"',
      ],
    },
    {
      title: 'Jalankan Migration Script',
      description: 'Copy dan jalankan SQL script untuk membuat database',
      instructions: [
        'Buka file /supabase/migrations/001_initial_schema.sql',
        'Copy seluruh isi file (Ctrl+A → Ctrl+C)',
        'Paste di SQL Editor Supabase (Ctrl+V)',
        'Klik tombol "Run" di pojok kanan bawah',
        'Tunggu hingga muncul pesan "Success"',
      ],
    },
    {
      title: 'Verifikasi Setup',
      description: 'Pastikan tabel telah dibuat dengan benar',
      instructions: [
        'Buka "Table Editor" di Supabase Dashboard',
        'Verifikasi 6 tabel telah dibuat:',
        '  • customers',
        '  • sales_teams',
        '  • products',
        '  • transactions',
        '  • transaction_items',
        '  • inventory_logs',
      ],
    },
    {
      title: 'Selesai! 🎉',
      description: 'Database siap digunakan',
      instructions: [
        'Tutup window ini dan refresh halaman',
        'Anda akan melihat 5 produk sample di Dashboard Gudang',
        'Mulai gunakan aplikasi untuk mengelola inventory',
        'Baca dokumentasi lengkap di /README-USER-GUIDE.md',
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="mx-4 w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Database className="size-6" />
              </div>
              <div>
                <CardTitle>Setup Database PT AOMA Prima Medika</CardTitle>
                <CardDescription>
                  Ikuti langkah berikut untuk setup database pertama kali
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between">
            {steps.map((_, index) => (
              <div key={index} className="flex items-center">
                <div
                  className={`flex size-8 items-center justify-center rounded-full text-sm font-medium ${
                    index + 1 === step
                      ? 'bg-primary text-primary-foreground'
                      : index + 1 < step
                      ? 'bg-green-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {index + 1 < step ? <CheckCircle className="size-5" /> : index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-0.5 w-16 ${
                      index + 1 < step ? 'bg-green-500' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Current Step */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">{steps[step - 1].title}</h3>
              <p className="text-sm text-muted-foreground">
                {steps[step - 1].description}
              </p>
            </div>

            <Alert>
              <AlertCircle className="size-4" />
              <AlertTitle>Instruksi Step {step}</AlertTitle>
              <AlertDescription>
                <ol className="mt-2 space-y-2">
                  {steps[step - 1].instructions.map((instruction, index) => (
                    <li key={index} className="text-sm">
                      {instruction.startsWith('•') ? (
                        <span className="ml-4">{instruction}</span>
                      ) : (
                        <span>
                          {index + 1}. {instruction}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </AlertDescription>
            </Alert>

            {step === 1 && (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
              >
                <ExternalLink className="size-4" />
                Buka Supabase Dashboard
              </Button>
            )}

            {step === 2 && (
              <Alert variant="default" className="bg-muted">
                <AlertTitle>📁 Lokasi File</AlertTitle>
                <AlertDescription>
                  <code className="text-xs">/supabase/migrations/001_initial_schema.sql</code>
                  <p className="mt-2 text-sm">
                    File ini berisi SQL script untuk membuat semua tabel, triggers, dan sample data.
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-4">
            <Button
              variant="outline"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
            >
              Kembali
            </Button>
            {step < steps.length ? (
              <Button onClick={() => setStep(Math.min(steps.length, step + 1))}>
                Lanjut
              </Button>
            ) : (
              <Button onClick={onClose} className="gap-2">
                <CheckCircle className="size-4" />
                Selesai & Mulai Gunakan
              </Button>
            )}
          </div>

          {/* Quick Links */}
          <div className="border-t pt-4">
            <p className="mb-2 text-sm font-medium">Dokumentasi Lengkap:</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                README-USER-GUIDE.md
              </Button>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                QUICK-START.md
              </Button>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                database-schema.md
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
