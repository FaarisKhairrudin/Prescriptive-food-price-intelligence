import { useState, useEffect } from "react";
import { Search, Lock, Unlock, Trash2, Eye, X, ShieldAlert, Users } from "lucide-react";
import { useAppContext } from "../context/AppContext";

export function AdminUsersPage() {
  const { token, user: currentUser } = useAppContext();
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'block' | 'unblock' | 'delete', user }
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengambil daftar pengguna.");
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirmAction() {
    if (!confirmAction) return;
    setActionLoading(true);
    setError("");
    setSuccessMessage("");

    const { type, user } = confirmAction;
    let url = "";
    let body = {};

    if (type === "block" || type === "unblock") {
      url = "/api/admin/users/block";
      body = { user_id: user.id, block: type === "block" };
    } else if (type === "delete") {
      url = "/api/admin/users/delete";
      body = { user_id: user.id };
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Aksi gagal dijalankan.");

      setSuccessMessage(data.message || "Aksi berhasil dijalankan.");
      setConfirmAction(null);
      await fetchUsers(); // reload list
      
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.business_type && u.business_type.toLowerCase().includes(q))
    );
  });

  return (
    <div className="page-container">
      <style>{`
        .admin-users-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .admin-users-title {
          font-size: 24px;
          font-weight: 800;
          color: var(--ink);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .admin-search-container {
          position: relative;
          width: 320px;
          max-width: 100%;
        }
        .admin-search-input {
          width: 100%;
          padding: 10px 14px 10px 40px;
          border-radius: 10px;
          border: 1px solid var(--card-border);
          background: var(--card);
          color: var(--ink);
          font-family: inherit;
          font-size: 14px;
          outline: none;
          transition: all 0.2s ease;
        }
        .admin-search-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(42, 69, 53, 0.1);
        }
        .admin-search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--muted);
          pointer-events: none;
        }
        .admin-table-card {
          background: var(--card);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
        }
        .admin-table-wrapper {
          overflow-x: auto;
        }
        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .admin-table th {
          padding: 16px 20px;
          background: rgba(0, 0, 0, 0.02);
          border-bottom: 1px solid var(--card-border);
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--muted);
          font-weight: 700;
        }
        .admin-table td {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.04);
          font-size: 14px;
          color: var(--ink);
          vertical-align: middle;
        }
        .admin-table tr:last-child td {
          border-bottom: none;
        }
        .admin-table tr:hover td {
          background: rgba(42, 69, 53, 0.01);
        }
        .badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 30px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .badge.admin {
          background: rgba(42, 69, 53, 0.1);
          color: var(--primary);
        }
        .badge.active {
          background: rgba(22, 101, 52, 0.1);
          color: #166534;
        }
        .badge.blocked {
          background: rgba(180, 83, 9, 0.1);
          color: #b45309;
        }
        .badge.deleted {
          background: rgba(153, 27, 27, 0.1);
          color: #991b1b;
        }
        .admin-actions {
          display: flex;
          gap: 8px;
        }
        .admin-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid var(--card-border);
          background: var(--card);
          color: var(--muted);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .admin-action-btn:hover:not(:disabled) {
          background: #f4f6f4;
          color: var(--ink);
          border-color: #cbd5e1;
        }
        .admin-action-btn.danger:hover:not(:disabled) {
          background: #fee2e2;
          color: #991b1b;
          border-color: #fca5a5;
        }
        .admin-action-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .status-banner {
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 14px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
        }
        .status-banner.success {
          background: rgba(22, 101, 52, 0.1);
          color: #166534;
          border: 1px solid rgba(22, 101, 52, 0.2);
        }
        .status-banner.error {
          background: rgba(153, 27, 27, 0.1);
          color: #991b1b;
          border: 1px solid rgba(153, 27, 27, 0.2);
        }
      `}</style>

      <div className="admin-users-header">
        <h2 className="admin-users-title">
          <Users size={26} />
          Kelola Pengguna
        </h2>
        <div className="admin-search-container">
          <Search size={18} className="admin-search-icon" />
          <input
            className="admin-search-input"
            type="text"
            placeholder="Cari email atau jenis usaha..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="status-banner error">
          <ShieldAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="status-banner success">
          <span>{successMessage}</span>
        </div>
      )}

      {isLoading ? (
        <div className="page-loader">
          <span>Memuat data pengguna...</span>
        </div>
      ) : (
        <div className="admin-table-card">
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Pengguna</th>
                  <th>Jenis Usaha</th>
                  <th>Peran</th>
                  <th>Status</th>
                  <th>Terakhir Login</th>
                  <th style={{ width: 140 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
                      Tidak ada pengguna ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = currentUser?.email === u.email;
                    return (
                      <tr key={u.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{u.email}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                            Dibuat: {u.created_at || "-"}
                          </div>
                        </td>
                        <td>{u.business_type || <span style={{ color: "var(--muted)" }}>Umum</span>}</td>
                        <td>
                          {u.is_admin ? (
                            <span className="badge admin">Admin</span>
                          ) : (
                            <span className="badge" style={{ background: "#f1f5f9", color: "#64748b" }}>UMKM</span>
                          )}
                        </td>
                        <td>
                          {u.deleted_at ? (
                            <span className="badge deleted">Deleted</span>
                          ) : u.is_blocked ? (
                            <span className="badge blocked">Blocked</span>
                          ) : (
                            <span className="badge active">Active</span>
                          )}
                        </td>
                        <td>{u.last_login || <span style={{ color: "var(--muted)" }}>Belum pernah</span>}</td>
                        <td>
                          <div className="admin-actions">
                            <button
                              className="admin-action-btn"
                              title="Lihat Detail Profil"
                              onClick={() => setSelectedUser(u)}
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              className="admin-action-btn"
                              title={u.is_blocked ? "Buka Blokir" : "Blokir"}
                              disabled={isSelf || !!u.deleted_at || u.is_admin}
                              onClick={() =>
                                setConfirmAction({
                                  type: u.is_blocked ? "unblock" : "block",
                                  user: u
                                })
                              }
                            >
                              {u.is_blocked ? <Unlock size={16} style={{ color: "var(--primary)" }} /> : <Lock size={16} />}
                            </button>
                            <button
                              className="admin-action-btn danger"
                              title="Hapus Akun (Soft-delete)"
                              disabled={isSelf || !!u.deleted_at || u.is_admin}
                              onClick={() =>
                                setConfirmAction({
                                  type: "delete",
                                  user: u
                                })
                              }
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal Overlay */}
      {confirmAction && (
        <div className="confirm-overlay" onClick={() => setConfirmAction(null)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div
              className="confirm-icon-wrapper"
              style={{
                background: confirmAction.type === "delete" ? "#fee2e2" : "#fef3c7",
                color: confirmAction.type === "delete" ? "#dc2626" : "#d97706"
              }}
            >
              {confirmAction.type === "delete" ? <Trash2 size={24} /> : confirmAction.type === "block" ? <Lock size={24} /> : <Unlock size={24} />}
            </div>
            <h3 className="confirm-title" style={{ marginTop: 16 }}>
              {confirmAction.type === "delete"
                ? "Konfirmasi Hapus"
                : confirmAction.type === "block"
                ? "Konfirmasi Blokir"
                : "Konfirmasi Buka Blokir"}
            </h3>
            <p className="confirm-text">
              {confirmAction.type === "delete"
                ? `Apakah Anda yakin ingin menonaktifkan secara permanen (soft-delete) pengguna "${confirmAction.user.email}"? Pengguna tidak akan dapat mengakses akun ini lagi.`
                : confirmAction.type === "block"
                ? `Apakah Anda yakin ingin memblokir pengguna "${confirmAction.user.email}"? Akses login dan API pengguna akan ditangguhkan.`
                : `Apakah Anda yakin ingin mengaktifkan kembali pengguna "${confirmAction.user.email}"?`}
            </p>
            <div className="confirm-buttons" style={{ width: "100%", display: "flex", gap: 12, marginTop: 16 }}>
              <button
                className="confirm-btn confirm-btn-cancel"
                style={{ flex: 1 }}
                onClick={() => setConfirmAction(null)}
                disabled={actionLoading}
              >
                Batal
              </button>
              <button
                className="confirm-btn"
                style={{
                  flex: 1,
                  background: confirmAction.type === "delete" ? "#dc2626" : "var(--primary)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
                onClick={handleConfirmAction}
                disabled={actionLoading}
              >
                {actionLoading ? "Memproses..." : "Ya, Lanjutkan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User details profile modal */}
      {selectedUser && (
        <div className="confirm-overlay" onClick={() => setSelectedUser(null)}>
          <div
            className="confirm-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "480px", maxWidth: "95vw", textAlign: "left", alignItems: "stretch", padding: "24px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(0,0,0,0.08)", paddingBottom: "12px", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>Profil Detail Pengguna</h3>
              <button
                onClick={() => setSelectedUser(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--muted)", fontWeight: "700" }}>Email</span>
                <div style={{ fontSize: "14px", fontWeight: "500", color: "var(--ink)", marginTop: 2 }}>{selectedUser.email}</div>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--muted)", fontWeight: "700" }}>Jenis Usaha</span>
                  <div style={{ fontSize: "14px", fontWeight: "500", marginTop: 2 }}>{selectedUser.business_type || "Umum"}</div>
                </div>
                <div>
                  <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--muted)", fontWeight: "700" }}>Status</span>
                  <div style={{ marginTop: 2 }}>
                    {selectedUser.deleted_at ? (
                      <span className="badge deleted">Deleted</span>
                    ) : selectedUser.is_blocked ? (
                      <span className="badge blocked">Blocked</span>
                    ) : (
                      <span className="badge active">Active</span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ margin: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}></div>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "13px", fontWeight: "700", color: "var(--primary)" }}>Parameter Bisnis & Preferensi</h4>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--muted)", fontWeight: "700" }}>Pemakaian Harian</span>
                  <div style={{ fontSize: "14px", fontWeight: "500", marginTop: 2 }}>
                    {selectedUser.daily_usage_kg !== null && selectedUser.daily_usage_kg !== undefined ? `${selectedUser.daily_usage_kg} kg/hari` : "-"}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--muted)", fontWeight: "700" }}>Kapasitas Simpan</span>
                  <div style={{ fontSize: "14px", fontWeight: "500", marginTop: 2 }}>
                    {selectedUser.storage_capacity_kg !== null && selectedUser.storage_capacity_kg !== undefined ? `${selectedUser.storage_capacity_kg} kg` : "-"}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--muted)", fontWeight: "700" }}>Ketahanan Stok</span>
                  <div style={{ fontSize: "14px", fontWeight: "500", marginTop: 2 }}>
                    {selectedUser.stock_days !== null && selectedUser.stock_days !== undefined ? `${selectedUser.stock_days} hari` : "-"}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--muted)", fontWeight: "700" }}>Gaya Belanja</span>
                  <div style={{ fontSize: "14px", fontWeight: "500", marginTop: 2 }}>{selectedUser.buying_style || "-"}</div>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--muted)", fontWeight: "700" }}>Fleksibilitas Menyesuaikan Harga Menu</span>
                  <div style={{ fontSize: "14px", fontWeight: "500", marginTop: 2 }}>{selectedUser.can_adjust_price || "-"}</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
              <button
                className="confirm-btn confirm-btn-cancel"
                style={{ margin: 0, padding: "8px 20px" }}
                onClick={() => setSelectedUser(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
