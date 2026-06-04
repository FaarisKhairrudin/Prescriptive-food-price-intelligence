import React, { useState } from 'react';
import { Search, TrendingUp, TrendingDown, Store, Calendar, ArrowRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Prediksi({ query, setQuery, tanggal, setTanggal, hasData, setHasData }) {
  const [usaha, setUsaha] = useState({ jenis: '', kebutuhan: '' });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const formatRp = (num) => new Intl.NumberFormat('id-ID').format(num);

  const emptyData = [
    { name: 'W-2', historis: null }, { name: 'W-1', historis: null }, { name: 'H-0', historis: null },
    { name: 'W+1', prediksi: null }, { name: 'W+2', prediksi: null }, { name: 'W+3', prediksi: null }, { name: 'W+4', prediksi: null }
  ];

  const nbeatsData = [
    { name: 'W-2', historis: 57500 }, { name: 'W-1', historis: 57500 }, { name: 'H-0', historis: 58175, prediksi: 58175 },
    { name: 'W+1', prediksi: 52549 }, { name: 'W+2', prediksi: 53047 }, { name: 'W+3', prediksi: 57404 }, { name: 'W+4', prediksi: 60982 }
  ];

  const jalankanPrediksi = () => {
    if (!query || !tanggal || !usaha.jenis || !usaha.kebutuhan) {
      setErrorMsg('Harap isi semua kolom (Komoditas, Tanggal, dan Profil Usaha) sebelum memulai.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    setTimeout(() => {
      setHasData(true); // Mengaktifkan data global
      setLoading(false);
    }, 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') jalankanPrediksi();
  };

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-bold mb-1">Prediksi</h1>
          {errorMsg && <p className="text-sm text-red-500 font-bold">{errorMsg}</p>}
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" placeholder="Komoditas..." value={query} 
              onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown} 
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm w-48 focus:outline-none focus:border-secondary" 
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="date" value={tanggal} 
              onChange={(e) => setTanggal(e.target.value)} onKeyDown={handleKeyDown} 
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm w-44 focus:outline-none focus:border-secondary text-grayText" 
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-end gap-4">
        <div className="flex-1">
          <label className="block text-sm font-bold text-secondary mb-2">Jenis Usaha F&B</label>
          <input 
            type="text" placeholder="misal: UMKM Sambal..." value={usaha.jenis}
            onChange={(e) => setUsaha({...usaha, jenis: e.target.value})} onKeyDown={handleKeyDown}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-bold text-secondary mb-2">Kebutuhan Stok Mingguan (Kg)</label>
          <input 
            type="number" placeholder="misal: 15" value={usaha.kebutuhan}
            onChange={(e) => setUsaha({...usaha, kebutuhan: e.target.value})} onKeyDown={handleKeyDown}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary text-sm"
          />
        </div>
        <button 
          onClick={jalankanPrediksi}
          className="bg-secondary text-white font-bold py-2.5 px-6 rounded-xl hover:bg-alternative transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
        >
          {loading ? 'Memproses...' : 'Mulai Analisis'} <ArrowRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative">
          <span className="absolute top-5 right-5 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-md">LIVE</span>
          <p className="text-[10px] font-bold text-grayText uppercase">Harga Saat Ini</p>
          <h2 className="text-2xl font-bold mt-1">{hasData ? `Rp ${formatRp(58175)}` : 'Rp -'}</h2>
        </div>
        <div className="bg-secondary text-white p-5 rounded-2xl relative shadow-sm">
          <p className="text-[10px] font-bold text-gray-300 uppercase">Prediksi Minggu 1</p>
          <h2 className="text-2xl font-bold mt-1">{hasData ? `Rp ${formatRp(52549)}` : 'Rp -'}</h2>
          <span className={`absolute top-5 right-5 text-[10px] font-bold px-2 py-1 rounded ${hasData ? 'bg-primary text-secondary' : 'bg-gray-400'}`}>W+1</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-grayText uppercase">Puncak Prediksi</p>
          <h2 className="text-2xl font-bold mt-1">{hasData ? `Rp ${formatRp(60982)}` : 'Rp -'}</h2>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-grayText uppercase">Tren Keseluruhan</p>
          <h2 className={`text-2xl font-bold flex items-center mt-1 ${hasData ? 'text-green-600' : 'text-gray-400'}`}>
            <TrendingDown className="mr-2" size={20}/> {hasData ? '3.3%' : '-'}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 flex-1">
        <div className="col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold">Proyeksi Transmisi Harga 4 Minggu ke Depan</h3>
            {hasData && (
              <span className="text-xs text-grayText font-bold bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
                {usaha.jenis || '[Usaha]'} · {usaha.kebutuhan || '0'} Kg/Minggu
              </span>
            )}
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hasData ? nbeatsData : emptyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6E726E'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6E726E'}} domain={hasData ? [45000, 65000] : [0, 100]} />
                <Tooltip formatter={(value) => `Rp ${formatRp(value)}`} />
                <Line type="monotone" dataKey="historis" stroke="#204B2D" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="prediksi" stroke="#C4EA57" strokeWidth={2.5} strokeDasharray="6 6" dot={{r: 4, fill: '#204B2D'}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-1 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-bold mb-4">Panel Keputusan Stok</h3>
          <div className="space-y-3">
             {[
              { w: 'W+1', price: 52549, act: 'Beli', bg: 'bg-primary text-secondary' },
              { w: 'W+2', price: 53047, act: 'Beli', bg: 'bg-primary text-secondary' },
              { w: 'W+3', price: 57404, act: 'Pantau', bg: 'bg-yellow-100 text-yellow-800' },
              { w: 'W+4', price: 60982, act: 'Simpan', bg: 'bg-red-100 text-red-800' }
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center border border-gray-100 p-3 rounded-xl">
                <div className="text-center bg-gray-50 px-3 py-1 rounded-lg">
                  <p className="text-xs font-bold text-grayText">{item.w}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">{hasData ? `Rp ${formatRp(item.price)}` : 'Rp -'}</p>
                  {hasData && <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${item.bg}`}>{item.act}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}