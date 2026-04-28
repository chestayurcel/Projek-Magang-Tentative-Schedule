"use client";

import { useState } from "react";
import { createUnit, updateUnit, deleteUnit } from "@/actions/admin";
import { Edit2, Trash2, Plus, X } from "lucide-react";

interface UnitsClientProps {
  initialUnits: any[];
}

export default function UnitsClient({ initialUnits }: UnitsClientProps) {
  const [isModalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [selectedUnit, setSelectedUnit] = useState<{ id: number; name: string } | null>(null);
  const [unitName, setUnitName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const openCreateModal = () => {
    setModalMode("CREATE");
    setUnitName("");
    setModalOpen(true);
  };

  const openEditModal = (id: number, currentName: string) => {
    setModalMode("EDIT");
    setSelectedUnit({ id, name: currentName });
    setUnitName(currentName);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!unitName.trim()) return alert("Nama unit tidak boleh kosong!");
    setIsProcessing(true);
    let res;

    if (modalMode === "CREATE") {
      res = await createUnit(unitName);
    } else if (modalMode === "EDIT" && selectedUnit) {
      res = await updateUnit(selectedUnit.id, unitName);
    }

    setIsProcessing(false);
    if (res?.error) {
      alert(res.error);
    } else {
      setModalOpen(false);
    }
  };

  const handleDelete = async (id: number, currentName: string, usersCount: number) => {
    if (usersCount > 0) {
      return alert(`TIDAK DIIZINKAN: Unit "${currentName}" masih memiliki ${usersCount} pegawai yang terdaftar. Pindahkan atau hapus pegawai tersebut terlebih dahulu.`);
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus Unit "${currentName}" secara permanen?`)) return;
    
    setIsProcessing(true);
    const res = await deleteUnit(id);
    setIsProcessing(false);
    
    if (res?.error) {
      alert(res.error);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Actions */}
      <div className="flex justify-end">
        <button 
          onClick={openCreateModal}
          className="flex items-center px-4 py-2 bg-[#ff7900] text-white font-medium rounded-lg hover:bg-[#e06900] transition shadow-sm"
        >
          <Plus size={18} className="mr-2" /> Tambah Unit
        </button>
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 w-16 text-center">No</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Nama Divisi / Unit</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-center">Jumlah Pegawai</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-center w-32">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {initialUnits.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    Belum ada data unit.
                  </td>
                </tr>
              ) : (
                initialUnits.map((unit, idx) => (
                  <tr key={unit.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 font-medium text-slate-500 text-center">{idx + 1}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{unit.unit_name}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        unit._count.users > 0 ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"
                      }`}>
                        {unit._count.users} Orang
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button 
                          onClick={() => openEditModal(unit.id, unit.unit_name)}
                          className="p-1.5 text-slate-400 hover:text-kai-blue hover:bg-blue-50 rounded transition"
                          title="Edit Unit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(unit.id, unit.unit_name, unit._count.users)}
                          className={`p-1.5 rounded transition ${
                            unit._count.users > 0 
                              ? "text-slate-300 cursor-not-allowed" 
                              : "text-slate-400 hover:text-red-600 hover:bg-red-50"
                          }`}
                          title={unit._count.users > 0 ? "Tidak bisa dihapus (Masih ada anggota)" : "Hapus Unit"}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CRUD Modal Tailwind */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95">
            <div className="bg-[#00529b] px-6 py-4 flex justify-between items-center text-white">
              <h2 className="text-lg font-bold tracking-wide">
                {modalMode === "CREATE" ? "Tambah Unit Baru" : "Edit Nama Unit"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="hover:bg-white/20 p-1 rounded-md transition duration-200">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Nama Unit</label>
                <input 
                  type="text" 
                  autoFocus
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00529b] outline-none text-sm transition" 
                  placeholder="Misal: Sarana" 
                />
              </div>
              <div className="flex justify-end pt-4 space-x-3">
                 <button onClick={() => setModalOpen(false)} className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded">
                   Batal
                 </button>
                 <button disabled={isProcessing} onClick={handleSave} className="px-4 py-2 font-medium bg-[#ff7900] hover:bg-[#e06900] text-white rounded disabled:opacity-50 transition-colors shadow-sm">
                   {isProcessing ? "Menyimpan..." : "Simpan Unit"}
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
