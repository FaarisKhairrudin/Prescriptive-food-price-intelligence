import React, { useState } from 'react';
import { Search, Bell, TrendingUp, TrendingDown, Calendar, Sparkles, Send } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Overview({ query, setQuery, tanggal, setTanggal, hasData, setHasData }) {
  const [loading, setLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const formatRp = (num) => new Intl.NumberFormat('id-ID').format(num);

  const emptyData = [
    { name: 'W-3', historis: null }, { name: 'W-2', historis: null }, 
    { name: 'W-1', historis: null }, { name: 'H-0', historis: null, prediksi: null },
    { name: 'W+1', prediksi: null }, { name: 'W+2', prediksi: null },
    { name: 'W+3', prediksi: null }, { name: 'W+4', prediksi: null },
  ];

  const nbeatsData = [
    { name: 'W-3', historis: 56000 }, { name: 'W-2', historis: 57500 },
    { name: 'W-1', historis: 57500 }, { name: 'H-0', historis: 58175, prediksi: 58175 },
    { name: 'W+1', prediksi: 52549 }, { name: 'W+2', prediksi: 53047 },
    { name: 'W+3', prediksi: 57404 }, { name: 'W+4', prediksi: 60982 },
  ];

  const jalankanPencarian = () => {
    if (!query || !tanggal) {
      setErrorMsg('Harap isi komoditas dan tanggal pantauan.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    setTimeout(() => {
      setHasData(true);
      setLoading(false);
    }, 1200);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') jalankanPencarian();
  };

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-grayText mb-1">{hasData ? `Data per ${tanggal}` : 'Pilih tanggal pantauan'}</p>
          <h1 className="text-2xl font-bold">Selamat datang kembali, [User] 👋</h1>
          {errorMsg && <p className="text-sm text-red-500 font-bold mt-1">{errorMsg}</p>}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" placeholder="Cari komoditas..." value={query}
              onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown}
              className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm w-48 focus:outline-none focus:border-secondary" 
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="date" value={tanggal}
              onChange={(e) => setTanggal(e.target.value)} onKeyDown={handleKeyDown}
              className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm w-44 focus:outline-none focus:border-secondary text-grayText" 
            />
          </div>
          <button 
            onClick={jalankanPencarian}
            className="bg-secondary text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-alternative transition-colors shadow-sm"
          >
            Pantau
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative">
          <span className="absolute top-5 right-5 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-md">LIVE</span>
          <p className="text-xs font-bold text-grayText mb-2 uppercase">Harga Saat Ini</p>
          <h2 className="text-3xl font-bold mb-1">
            {loading ? 'Memuat...' : hasData ? `Rp ${formatRp(58175)}` : 'Rp -'} <span className="text-sm font-normal text-grayText">/ kg</span>
          </h2>
          <p className="text-xs text-grayText">{hasData ? `${tanggal} · Pasar Caringin` : 'Menunggu input...'}</p>
        </div>
        
        <div className="bg-secondary text-white p-5 rounded-2xl shadow-sm relative">
          <span className={`absolute top-5 right-5 text-secondary text-[10px] font-bold px-3 py-1 rounded-full ${hasData ? 'bg-primary' : 'bg-gray-400'}`}>
            ● {hasData ? 'BELI SEKARANG' : 'MENUNGGU'}
          </span>
          <p className="text-xs font-bold text-gray-300 mb-2 uppercase">Sinyal Pengadaan</p>
          <h2 className="text-2xl font-bold mb-1">{loading ? 'Menganalisis...' : hasData ? 'Pertimbangkan Stok Lebih Awal' : '-'}</h2>
          <p className="text-xs text-primary flex items-center gap-1">
            {hasData && <><TrendingUp size={14}/> +18.3% <span className="text-gray-300 ml-1">proyeksi 4 minggu</span></>}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative">
          <p className="text-xs font-bold text-grayText mb-2 uppercase">Rata-rata Prediksi 4 Minggu</p>
          <h2 className="text-3xl font-bold mb-1">
             {loading ? 'Memuat...' : hasData ? `Rp ${formatRp(56246)}` : 'Rp -'} <span className="text-sm font-normal text-grayText">/ kg</span>
          </h2>
          {hasData && <p className="text-xs text-red-500 bg-red-50 w-fit px-2 py-0.5 rounded flex items-center gap-1"><TrendingDown size={14}/> -3.3% <span className="text-grayText ml-1">vs minggu ini</span></p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between mb-4">
            <div>
              <h3 className="font-bold">Pergerakan Harga {hasData ? query : ''}</h3>
              <p className="text-xs text-grayText">Pasar Bandung · 4 minggu historis + 4 minggu prediksi</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1"><div className="w-4 h-0.5 bg-secondary"></div> Historis</span>
              <span className="flex items-center gap-1"><div className="w-4 h-0.5 border-t-2 border-dashed border-primary"></div> Prediksi</span>
            </div>
          </div>
          <div className="h-64 opacity-90">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hasData ? nbeatsData : emptyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6E726E'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6E726E'}} domain={hasData ? [45000, 65000] : [0, 100]} />
                <Tooltip formatter={(value) => `Rp ${formatRp(value)}`} />
                <Line type="monotone" dataKey="historis" stroke="#204B2D" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="prediksi" stroke="#C4EA57" strokeWidth={2.5} strokeDasharray="5 5" dot={{r: 4, fill: '#204B2D'}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-1 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold">Forecast Mingguan</h3>
            <span className="text-[10px] text-secondary font-bold bg-green-50 px-2 py-1 rounded">NBEATSx v2.4</span>
          </div>
          <div className="space-y-3">
            {[
              { w: 'W+1', price: 52549, trend: -9.7, up: false },
              { w: 'W+2', price: 53047, trend: -8.8, up: false },
              { w: 'W+3', price: 57404, trend: -1.3, up: false },
              { w: 'W+4', price: 60982, trend: 4.8, up: true }
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center border border-gray-100 p-3 rounded-xl">
                <div className="flex gap-3 items-center">
                  <div className="text-center bg-gray-50 px-2 py-1 rounded-lg">
                    <p className="text-[10px] font-bold text-grayText">{item.w}</p>
                  </div>
                  <div>
                    <p className="font-bold text-sm">{hasData ? `Rp ${formatRp(item.price)}` : 'Rp -'}</p>
                  </div>
                </div>
                <div className={`text-xs font-bold flex items-center ${!hasData ? 'text-gray-300' : item.up ? 'text-red-500' : 'text-green-600'}`}>
                  {hasData && (item.up ? <TrendingUp size={12} className="mr-1"/> : <TrendingDown size={12} className="mr-1"/>)}
                  {hasData ? `${Math.abs(item.trend)}%` : '-'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}