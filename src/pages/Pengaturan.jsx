import React from 'react';
import { Settings } from 'lucide-react';

export default function Pengaturan() {
  return (
    <div className="flex flex-col h-full gap-6">
      <h1 className="text-2xl font-bold">Pengaturan Bisnis</h1>
      
      <div className="flex-1 flex flex-col items-center justify-center text-grayText border-2 border-dashed border-gray-200 rounded-3xl bg-white/50">
        <Settings size={48} className="mb-4 text-gray-300" />
        <p className="font-bold text-lg text-gray-500">Halaman Pengaturan Belum Tersedia</p>
        <p className="text-sm">Fitur ini sedang dalam tahap pengembangan.</p>
      </div>
    </div>
  );
}