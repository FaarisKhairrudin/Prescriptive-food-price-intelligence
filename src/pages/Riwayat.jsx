import React, { useState } from 'react';
import { Search, Calendar, ArrowUpRight } from 'lucide-react';

export default function Riwayat({ query, setQuery, tanggal, setTanggal, hasData, setHasData }) {
  const [loading, setLoading] = useState(false);

  const formatRp = (num) => new Intl.NumberFormat('id-ID').format(num);

  const historyData = [
    { w: 'W-1', prediksi: 57500, riil: 58175, selisih: 675 },
    { w: 'W-2', prediksi: 54000, riil: 57500, selisih: 3500 },
    { w: 'W-3', prediksi: 55000, riil: 56000, selisih: 1000 },
    { w: 'W-4', prediksi: 53500, riil: 54000, selisih: 500 },
  ];

  const jalankanPencarian = () => {
    if (query && tanggal) {
      setLoading(true);
      setTimeout(() => {
        setHasData(true);
        setLoading(false);
      }, 1000);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') jalankanPencarian();
  };

  return (
    <div className="flex flex-col h-full gap-6 pb-8">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl font-bold mb-1">Riwayat Prediksi AI</h1>
          <p className="text-sm text-grayText">Evaluasi Kinerja NBEATSx</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" placeholder="Komoditas..." value={query} 
              onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown} 
              className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm w-48 focus:outline-none focus:border-secondary" 
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="date" value={tanggal} 
              onChange={(e) => setTanggal(e.target.value)} onKeyDown={handleKeyDown} 
              className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm w-44 focus:outline-none focus:border-secondary text-grayText" 
            />
          </div>
          <button 
            onClick={jalankanPencarian}
            className="bg-secondary text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-alternative shadow-sm"
          >
            {loading ? '...' : 'Cari'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative">
          <p className="text-[10px] font-bold text-grayText uppercase mb-1">Akurasi Arah (Directional)</p>
          <h2 className="text-4xl font-bold">{hasData ? '73.3%' : '-'}</h2>
          <span className="absolute top-5 right-5 text-[10px] font-bold px-2 py-1 bg-primary text-secondary rounded">AI v2.4</span>
        </div>
        <div className="bg-secondary text-white p-5 rounded-2xl shadow-sm">
          <p className="text-[10px] font-bold text-gray-300 uppercase mb-1">Rata-Rata Error (MAE)</p>
          <h2 className="text-3xl font-bold">Rp {hasData ? formatRp(3030) : '-'}</h2>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-grayText uppercase mb-1">Margin Error (MAPE)</p>
          <h2 className="text-4xl font-bold">{hasData ? '6.33%' : '-'}</h2>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-grayText uppercase mb-1">Periode</p>
          <h2 className="text-4xl font-bold">{hasData ? '4' : '-'}</h2>
          <p className="text-xs text-grayText mt-1">Minggu tercatat</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex-1">
        <h3 className="font-bold text-lg mb-6">Seberapa tepat tebakan AI?</h3>
        <div className="space-y-4">
          {(hasData ? historyData : Array(4).fill(null)).map((item, i) => (
            <div key={i} className="flex justify-between items-center border border-gray-100 p-4 rounded-xl">
              <div className="flex gap-4 items-center w-1/3">
                <div className="text-center bg-gray-50 px-3 py-1.5 rounded-lg">
                  <p className="text-sm font-bold">{hasData ? item.w : `W-${i+1}`}</p>
                </div>
                <div>
                  <p className="font-bold text-lg">{hasData ? `Rp ${formatRp(item.prediksi)}` : 'Rp -'}</p>
                  <span className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded font-bold">Prediksi</span>
                </div>
              </div>
              <div className="w-1/3 text-center">
                <p className="font-bold text-lg">{hasData ? `Rp ${formatRp(item.riil)}` : 'Rp -'}</p>
                <span className="text-[10px] bg-gray-200 text-gray-800 px-2 py-0.5 rounded font-bold">Harga Riil</span>
              </div>
              <div className="w-1/3 flex justify-end">
                {hasData ? (
                  <div className="text-sm font-bold text-red-500 flex items-center gap-1 bg-red-50 px-3 py-1.5 rounded-lg">
                    <ArrowUpRight size={16} /> Selisih Rp {formatRp(item.selisih)}
                  </div>
                ) : <span className="text-sm font-bold text-gray-300">-</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}