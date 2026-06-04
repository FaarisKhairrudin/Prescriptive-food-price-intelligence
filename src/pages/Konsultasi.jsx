import React, { useState, useRef, useEffect } from 'react';
import { Send, Plus, Sparkles, MessageSquare, Trash2 } from 'lucide-react';

export default function Konsultasi({ query, tanggal, hasData }) {
  const [chatHistory, setChatHistory] = useState([
    { 
      id: 1, 
      title: 'Strategi Stok Cabai', 
      messages: [
        { role: 'user', text: 'Kapan waktu terbaik untuk nyetok cabai bulan ini?' },
        { role: 'ai', text: 'Berdasarkan data PIHPS, harga cabai diprediksi turun di minggu kedua. Saya sarankan Anda menahan pembelian besar hingga tanggal 10.' }
      ] 
    }
  ]);

  // Pesan sapaan dinamis berdasarkan data global
  const defaultGreeting = hasData 
    ? `Halo! Saya melihat Anda sedang memantau ${query} pada tanggal ${tanggal}. Ada yang ingin didiskusikan tentang pergerakan harga ini?`
    : 'Halo! Saya asisten AI Narapangan. Ada yang bisa saya bantu terkait strategi pengadaan stok Anda hari ini?';

  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([{ role: 'ai', text: defaultGreeting }]);
  
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([{ role: 'ai', text: defaultGreeting }]);
  };

  const handleOpenHistory = (id) => {
    const session = chatHistory.find(chat => chat.id === id);
    if (session) {
      setActiveChatId(id);
      setMessages(session.messages);
    }
  };

  // Fungsi untuk menghapus riwayat chat
  const handleDeleteChat = (e, id) => {
    e.stopPropagation(); // Mencegah klik terdeteksi sebagai "buka chat"
    
    // Hapus dari state riwayat
    const updatedHistory = chatHistory.filter(chat => chat.id !== id);
    setChatHistory(updatedHistory);
    
    // Jika chat yang sedang dibuka dihapus, buat chat baru
    if (activeChatId === id) {
      handleNewChat();
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMessage = { role: 'user', text: input };
    const updatedMessages = [...messages, userMessage];
    
    setMessages(updatedMessages);
    setInput('');
    setIsTyping(true);

    let currentId = activeChatId;
    if (activeChatId === null) {
      currentId = Date.now();
      setActiveChatId(currentId);
      setChatHistory(prev => [
        { id: currentId, title: input.substring(0, 20) + '...', messages: updatedMessages },
        ...prev
      ]);
    } else {
      setChatHistory(prev => prev.map(chat => 
        chat.id === activeChatId ? { ...chat, messages: updatedMessages } : chat
      ));
    }

    // Simulasi jawaban AI yang menyertakan konteks data jika ada
    setTimeout(() => {
      const aiResponse = { 
        role: 'ai', 
        text: hasData 
          ? `Menarik. Mengingat tren harga ${query} dari ${tanggal}, model NBEATSx menyarankan agar Anda mengamankan stok sebelum minggu ke-3. (Ini adalah simulasi balasan backend)`
          : `Ini adalah respons simulasi. Jawaban ini akan digantikan oleh AI setelah disambungkan ke Backend Python Anda.` 
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setChatHistory(prev => prev.map(chat => 
        chat.id === currentId ? { ...chat, messages: [...updatedMessages, aiResponse] } : chat
      ));
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] bg-secondary rounded-3xl overflow-hidden p-6 gap-6 text-white">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-1.5 rounded-full"><Sparkles size={16} className="text-secondary" /></div>
          <span className="text-xs font-bold text-primary tracking-wider uppercase">AI Assistant</span>
        </div>
        {hasData && (
          <span className="text-[10px] bg-alternative text-primary px-3 py-1 rounded-full font-bold border border-alternative">
            Konteks Aktif: {query} ({tanggal})
          </span>
        )}
      </div>
      
      <div className="flex h-full gap-6 overflow-hidden">
        {/* PANEL KIRI (Riwayat & Pertanyaan Cepat) */}
        <div className="w-1/3 flex flex-col gap-6 overflow-y-auto pr-2">
          <div>
            <h1 className="text-2xl font-bold mb-2">Konsultasi AI</h1>
            <p className="text-sm text-gray-300">Diskusikan prediksi harga dan keputusan stok.</p>
          </div>
          
          <button onClick={handleNewChat} className="w-full flex items-center justify-center gap-2 py-3 border border-gray-400 rounded-xl hover:bg-alternative transition-colors">
            <Plus size={20} /> <span className="font-bold">Pesan Baru</span>
          </button>

          <div>
            <p className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">Pertanyaan Cepat</p>
            <div className="space-y-2">
              {[
                hasData ? `Bagaimana tren ${query} minggu depan?` : 'Kapan waktu terbaik untuk stok cabai?', 
                'Berapa anggaran optimal 4 minggu ke depan?', 
                'Risiko harga menjelang Ramadan?'
              ].map((q, i) => (
                <button 
                  key={i} 
                  onClick={() => setInput(q)} 
                  className="w-full text-left bg-alternative/60 hover:bg-primary hover:text-secondary text-gray-200 font-medium text-xs p-3 rounded-xl transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1">
            <p className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider mt-4">Riwayat Konsultasi</p>
            <div className="space-y-2">
              {chatHistory.map((chat) => (
                <div 
                  key={chat.id} 
                  onClick={() => handleOpenHistory(chat.id)}
                  className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${activeChatId === chat.id ? 'bg-primary text-secondary' : 'bg-alternative/40 hover:bg-alternative/80 text-white'}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <MessageSquare size={16} className="shrink-0" />
                    <p className="font-medium text-sm truncate w-40">{chat.title}</p>
                  </div>
                  {/* Tombol Hapus (Muncul saat di-hover) */}
                  <button 
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Hapus riwayat"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              
              {chatHistory.length === 0 && (
                <p className="text-xs text-gray-500 italic text-center mt-6">Belum ada riwayat chat.</p>
              )}
            </div>
          </div>
        </div>

        {/* PANEL KANAN (Obrolan Chat) */}
        <div className="w-2/3 bg-alternative/30 rounded-2xl flex flex-col p-6 border border-alternative relative">
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {messages.map((msg, i) => (
              <div key={i} className={`p-4 rounded-xl w-11/12 ${msg.role === 'ai' ? 'bg-secondary/50 border border-alternative rounded-tl-none' : 'bg-primary text-secondary rounded-tr-none ml-auto'}`}>
                {msg.role === 'ai' && <div className="flex items-center gap-2 mb-2 text-primary"><Sparkles size={14} /><span className="text-xs font-bold">NARAPANGAN AI</span></div>}
                <p className="text-sm leading-relaxed">{msg.text}</p>
              </div>
            ))}
            
            {isTyping && (
              <div className="bg-secondary/50 border border-alternative p-4 rounded-xl rounded-tl-none w-11/12 flex items-center gap-2 text-primary">
                <Sparkles size={14} /> <span className="text-xs font-bold animate-pulse">Mengetik balasan...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="mt-4 relative">
            <input 
              type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Tanyakan sesuatu di sini..." 
              className="w-full bg-secondary border border-gray-400 text-white placeholder-gray-400 rounded-xl pl-4 pr-12 py-4 focus:outline-none focus:border-primary text-sm"
            />
            <button 
              onClick={handleSend} disabled={isTyping || !input.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary text-secondary p-2 rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}