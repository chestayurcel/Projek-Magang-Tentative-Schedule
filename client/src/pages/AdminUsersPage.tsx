import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, UserX, Shield, Briefcase, Mail, BadgeCheck, Clock, UserPlus, Edit, Trash2, X, Tag } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface User {
  id: number;
  name: string;
  nipp: string;
  email: string;
  role: string;
  jabatan?: string | null;
  account_status: string;
  unit_id?: number | null;
  unit?: { unit_name: string } | null;
  createdAt: string;
}

interface Unit {
  id: number;
  unit_name: string;
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'ACTIVE'>('PENDING');
  const [processing, setProcessing] = useState<number | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    nipp: '',
    email: '',
    password: '',
    role: 'STAFF',
    unit_id: '',
    jabatan: ''
  });

  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchUnits();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (error) {
      console.error('Gagal mengambil data pegawai', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await api.get('/units');
      setUnits(res.data);
    } catch (error) {
      console.error('Gagal mengambil data unit', error);
    }
  };

  const handleApprove = async (id: number) => {
    if (!confirm('Setujui akun pegawai ini?')) return;
    setProcessing(id);
    try {
      await api.patch(`/users/${id}/approve`);
      fetchUsers(); // Refresh data
    } catch (error: any) {
      alert(error.response?.data?.error || 'Gagal menyetujui user');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm('Tolak dan hapus data registrasi ini? Data akan terhapus permanen.')) return;
    setProcessing(id);
    try {
      await api.delete(`/users/${id}/reject`);
      fetchUsers(); // Refresh data
    } catch (error: any) {
      alert(error.response?.data?.error || 'Gagal menolak user');
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus pegawai ini secara permanen? Semua data jadwal terkait juga mungkin terpengaruh.')) return;
    setProcessing(id);
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Gagal menghapus user');
    } finally {
      setProcessing(null);
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedUser(null);
    setFormData({ name: '', nipp: '', email: '', password: '', role: 'STAFF', unit_id: '', jabatan: '' });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setModalMode('edit');
    setSelectedUser(user);
    setFormData({ 
      name: user.name, 
      nipp: user.nipp, 
      email: user.email, 
      password: '', // Kosongkan password saat edit
      role: user.role, 
      unit_id: user.unit_id ? String(user.unit_id) : '', 
      jabatan: user.jabatan || '' 
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError('');

    try {
      const payload = { ...formData };
      if (modalMode === 'edit' && !payload.password) {
        delete (payload as any).password; // Jangan kirim password jika kosong saat edit
      }

      if (modalMode === 'create') {
        await api.post('/users', payload);
      } else {
        await api.put(`/users/${selectedUser?.id}`, payload);
      }
      
      setIsModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      setFormError(error.response?.data?.error || 'Terjadi kesalahan saat menyimpan data.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = users.filter(u => u.account_status === activeTab);
  const pendingCount = users.filter(u => u.account_status === 'PENDING').length;

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const canManageActive = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'MANAJER';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-kai-blue tracking-tight">Manajemen Pegawai</h1>
          <p className="text-slate-500 mt-1">Kelola data pegawai, persetujuan akun, peran, dan jabatan.</p>
        </div>
        
        {isSuperAdmin && activeTab === 'ACTIVE' && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 bg-kai-orange text-white text-sm font-semibold rounded-lg hover:bg-[#e06900] shadow-sm transition-colors"
          >
            <UserPlus size={16} className="mr-2" />
            Tambah Pegawai
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-200/50 p-1.5 rounded-lg w-max shadow-inner">
        <button
          onClick={() => setActiveTab('PENDING')}
          className={`px-6 py-2 rounded-md font-medium text-sm transition-all duration-200 flex items-center ${
            activeTab === 'PENDING' 
              ? "bg-white text-kai-blue shadow-sm" 
              : "text-slate-500 hover:text-kai-blue"
          }`}
        >
          <Clock size={16} className="mr-2" />
          Menunggu Persetujuan
          {pendingCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={`px-6 py-2 rounded-md font-medium text-sm transition-all duration-200 flex items-center ${
            activeTab === 'ACTIVE' 
              ? "bg-white text-kai-blue shadow-sm" 
              : "text-slate-500 hover:text-kai-blue"
          }`}
        >
          <BadgeCheck size={16} className="mr-2" />
          Daftar Pegawai
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kai-blue"></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <UserX size={56} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">Tidak ada data</h3>
          <p className="text-slate-500 mt-1">Tidak ada pegawai di kategori ini.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">Pegawai</th>
                  <th className="px-6 py-4">NIPP</th>
                  <th className="px-6 py-4">Unit / Divisi</th>
                  <th className="px-6 py-4">Jabatan</th>
                  <th className="px-6 py-4">Role</th>
                  {activeTab === 'PENDING' && <th className="px-6 py-4 text-right">Aksi</th>}
                  {activeTab === 'ACTIVE' && canManageActive && <th className="px-6 py-4 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-9 h-9 rounded-full bg-kai-blue/10 text-kai-blue flex items-center justify-center font-bold mr-3">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">{u.name}</div>
                          <div className="text-xs text-slate-500 flex items-center mt-0.5">
                            <Mail size={12} className="mr-1" /> {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{u.nipp}</td>
                    <td className="px-6 py-4">
                      <span className="flex items-center">
                        <Briefcase size={14} className="mr-2 text-slate-400" />
                        {u.unit?.unit_name || <span className="text-slate-400 italic">Belum Diatur</span>}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.jabatan ? (
                        <span className="text-slate-700">{u.jabatan}</span>
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        u.role === 'SUPER_ADMIN' ? 'bg-red-100 text-red-700' :
                        u.role === 'MANAJER' ? 'bg-purple-100 text-purple-700' :
                        u.role === 'ASISTEN_MANAJER' ? 'bg-blue-100 text-blue-700' :
                        u.role === 'SUPERVISOR' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        <Shield size={12} className="mr-1" />
                        {u.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    
                    {/* Aksi untuk PENDING */}
                    {activeTab === 'PENDING' && (
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => handleApprove(u.id)}
                          disabled={processing === u.id}
                          className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:opacity-50 transition"
                        >
                          <CheckCircle size={14} className="mr-1.5" /> Setujui
                        </button>
                        <button
                          onClick={() => handleReject(u.id)}
                          disabled={processing === u.id}
                          className="inline-flex items-center px-3 py-1.5 border border-red-300 text-red-600 text-xs font-medium rounded hover:bg-red-50 disabled:opacity-50 transition"
                        >
                          <XCircle size={14} className="mr-1.5" /> Tolak
                        </button>
                      </td>
                    )}

                    {/* Aksi untuk ACTIVE (Edit/Hapus) */}
                    {activeTab === 'ACTIVE' && canManageActive && (
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => openEditModal(u)}
                          disabled={processing === u.id}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                          title="Edit Pegawai"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          disabled={processing === u.id}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Hapus Pegawai"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal CRUD Pegawai */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
              <h3 className="text-lg font-bold text-slate-800">
                {modalMode === 'create' ? 'Tambah Pegawai Baru' : 'Edit Data Pegawai'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
                  {formError}
                </div>
              )}

              <form id="userForm" onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">NIPP</label>
                    <input
                      type="text"
                      required
                      value={formData.nipp}
                      onChange={(e) => setFormData({...formData, nipp: e.target.value})}
                      className="w-full text-sm border-slate-300 rounded-lg focus:ring-kai-blue focus:border-kai-blue py-2 px-3 border outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full text-sm border-slate-300 rounded-lg focus:ring-kai-blue focus:border-kai-blue py-2 px-3 border outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full text-sm border-slate-300 rounded-lg focus:ring-kai-blue focus:border-kai-blue py-2 px-3 border outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Password {modalMode === 'edit' && <span className="text-slate-400 font-normal">(Kosongkan jika tidak ingin diubah)</span>}
                  </label>
                  <input
                    type="password"
                    required={modalMode === 'create'}
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full text-sm border-slate-300 rounded-lg focus:ring-kai-blue focus:border-kai-blue py-2 px-3 border outline-none"
                    placeholder="Minimal 6 karakter"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Unit / Divisi</label>
                    <select
                      value={formData.unit_id}
                      onChange={(e) => setFormData({...formData, unit_id: e.target.value})}
                      className="w-full text-sm border-slate-300 rounded-lg focus:ring-kai-blue focus:border-kai-blue py-2 px-3 border outline-none bg-white"
                    >
                      <option value="">-- Pilih Unit --</option>
                      {units.map(unit => (
                        <option key={unit.id} value={unit.id}>{unit.unit_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Role Akses</label>
                    <select
                      required
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      className="w-full text-sm border-slate-300 rounded-lg focus:ring-kai-blue focus:border-kai-blue py-2 px-3 border outline-none bg-white"
                    >
                      {isSuperAdmin && <option value="SUPER_ADMIN">Super Admin</option>}
                      <option value="MANAJER">Manajer</option>
                      <option value="ASISTEN_MANAJER">Asisten Manajer</option>
                      <option value="SUPERVISOR">Supervisor</option>
                      <option value="STAFF">Staff</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jabatan Spesifik (Opsional)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Tag className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={formData.jabatan}
                      onChange={(e) => setFormData({...formData, jabatan: e.target.value})}
                      placeholder="Contoh: IT Support / Staf Pelaksana"
                      className="pl-9 w-full text-sm border-slate-300 rounded-lg focus:ring-kai-blue focus:border-kai-blue py-2 outline-none border transition"
                    />
                  </div>
                </div>

              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                form="userForm"
                disabled={isSaving}
                className="px-4 py-2 bg-kai-blue text-white rounded-lg text-sm font-medium hover:bg-[#00417a] transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Menyimpan...' : 'Simpan Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
