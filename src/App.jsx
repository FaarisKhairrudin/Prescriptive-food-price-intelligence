import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, History, Bot, Settings } from 'lucide-react';


import logoNarapangan from './assets/Logo Narapangan.png';

import Overview from './pages/Overview';
import Prediksi from './pages/Prediksi';
import Riwayat from './pages/Riwayat';
import Konsultasi from './pages/Konsultasi';
import Pengaturan from './pages/Pengaturan';

const Sidebar = () => {
  const menuItems = [
    { path: '/', name: 'Overview', icon: LayoutDashboard },
    { path: '/prediksi', name: 'Prediksi', icon: TrendingUp },
    { path: '/riwayat', name: 'Riwayat', icon: History },
    { path: '/konsultasi', name: 'Konsultasi AI', icon: Bot },
    { path: '/pengaturan', name: 'Pengaturan', icon: Settings },
  ];

  return (
    <div className="w-64 bg-secondary min-h-screen text-white flex flex-col fixed left-0 top-0 shadow-xl z-50">
      <div className="p-6 mb-2 flex items-center gap-3">
        <img src={logoNarapangan} alt="Logo Narapangan" className="w-8 h-8 object-contain" />
        <h1 className="text-xl font-bold italic tracking-wide">Narapangan</h1>
      </div>

      <div className="flex-1 px-4 space-y-1">
        <p className="text-[10px] text-gray-400 font-bold mb-3 px-2 tracking-widest uppercase">Menu</p>
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                isActive 
                  ? 'bg-primary text-secondary shadow-sm' 
                  : 'text-gray-300 hover:bg-alternative hover:text-white'
              }`
            }
          >
            <item.icon size={18} />
            {item.name}
          </NavLink>
        ))}
      </div>

      <div className="p-4 mt-auto mb-4">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-secondary font-bold text-lg">
            U
          </div>
          <div>
            <p className="text-sm font-bold text-white">[User]</p>
            <p className="text-xs text-primary">[Usaha Belum Diatur]</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [globalQuery, setGlobalQuery] = useState('');
  const [globalTanggal, setGlobalTanggal] = useState('');
  const [globalHasData, setGlobalHasData] = useState(false);

  const sharedProps = {
    query: globalQuery, setQuery: setGlobalQuery,
    tanggal: globalTanggal, setTanggal: setGlobalTanggal,
    hasData: globalHasData, setHasData: setGlobalHasData
  };

  return (
    <Router>
      <div className="flex bg-surface min-h-screen font-sans">
        <Sidebar />
        <div className="flex-1 ml-64 p-6 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Overview {...sharedProps} />} />
            <Route path="/prediksi" element={<Prediksi {...sharedProps} />} />
            <Route path="/riwayat" element={<Riwayat {...sharedProps} />} />
            {/* Mengirim data global ke Konsultasi AI */}
            <Route path="/konsultasi" element={<Konsultasi {...sharedProps} />} />
            <Route path="/pengaturan" element={<Pengaturan />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}