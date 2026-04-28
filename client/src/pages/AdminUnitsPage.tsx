import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Building2 } from 'lucide-react';
import api from '../lib/api';

interface Unit {
  id: number;
  unit_name: string;
  _count: { users: number };
}

export default function AdminUnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitNameInput, setUnitNameInput] = useState('');

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/units');
      setUnits(res.data);
    } catch (error) {
      console.error('Gagal mengambil data unit', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (unit?: Unit) => {
    if (unit) {
      setEditingUnit(unit);
      setUnitNameInput(unit.unit_name);
    } else {
      setEditingUnit(null);
      setUnitNameInput('');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUnit(null);
    setUnitNameInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingUnit) {
        await api.put(`/units/${editingUnit.id}`, { unit_name: unitNameInput });
      } else {
        await api.post('/units', { unit_name: unitNameInput });
      }
      handleCloseModal();
      fetchUnits(); // Refresh data
    } catch (error: any) {
      alert(error.response?.data?.error || 'Gagal menyimpan unit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Hapus unit "${name}" secara permanen?`)) return;

    try {
      await api.delete(`/units/${id}`);
      fetchUnits();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Gagal menghapus unit');
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-kai-blue tracking-tight">Manajemen Unit</h1>
          <p className="text-slate-500 mt-1">Kelola data unit kerja/divisi yang ada di KAI DAOP 6.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center px-4 py-2.5 bg-[#ff7900] text-white font-medium rounded-lg hover:bg-[#e06900] transition-all shadow-sm"
        >
          <Plus size={18} className="mr-2" />
          Tambah Unit
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kai-blue"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4 w-16 text-center">No</th>
                <th className="px-6 py-4">Nama Unit</th>
                <th className="px-6 py-4 text-center">Total Pegawai</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {units.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-slate-500 italic">Belum ada unit terdaftar.</td>
                </tr>
              ) : (
                units.map((unit, index) => (
                  <tr key={unit.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-center text-slate-400">{index + 1}</td>
                    <td className="px-6 py-4 font-semibold text-kai-blue flex items-center">
                      <Building2 size={16} className="mr-2 text-kai-orange" />
                      {unit.unit_name}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-slate-100 text-slate-700 py-1 px-3 rounded-full text-xs font-bold">
                        {unit._count.users}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenModal(unit)}
                        className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-medium rounded hover:bg-blue-100 transition"
                      >
                        <Edit2 size={14} className="mr-1" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(unit.id, unit.unit_name)}
                        className="inline-flex items-center px-3 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded hover:bg-red-100 transition"
                      >
                        <Trash2 size={14} className="mr-1" /> Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="bg-kai-blue px-6 py-4">
              <h2 className="text-lg font-bold tracking-wide text-white">
                {editingUnit ? 'Edit Unit' : 'Tambah Unit Baru'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                 <label className="text-sm font-medium text-slate-700">Nama Unit / Divisi</label>
                 <input 
                   required 
                   type="text" 
                   value={unitNameInput}
                   onChange={(e) => setUnitNameInput(e.target.value)}
                   className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-kai-blue outline-none transition" 
                   placeholder="Misal: Divisi SDM & Umum" 
                   autoFocus
                 />
              </div>
              <div className="flex justify-end pt-4 space-x-3 border-t border-slate-100">
                 <button type="button" onClick={handleCloseModal} className="px-4 py-2.5 font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition">
                   Batal
                 </button>
                 <button disabled={isSubmitting || !unitNameInput.trim()} type="submit" className="px-5 py-2.5 font-medium bg-[#ff7900] hover:bg-[#e06900] text-white rounded-lg disabled:opacity-50 transition-colors shadow-sm">
                   {isSubmitting ? "Menyimpan..." : "Simpan"}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
