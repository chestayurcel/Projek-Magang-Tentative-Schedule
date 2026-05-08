import { useState } from "react";
import { Calendar, FileText, Download, Loader2, FileDown, AlertCircle } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

// ====== Types ======
interface RecapUser {
  id: number;
  name: string;
  nipp: string;
  jabatan: string | null;
  unit?: { id: number; unit_name: string } | null;
}

interface RecapScheduleItem {
  id: number;
  type: "INTERNAL" | "TAMU";
  category: "PRIBADI" | "UNIT" | "BERSAMA";
  notes: string | null;
  start_time: string;
  end_time: string;
  time_range: string;
  user: RecapUser | null;
  target_user: { id: number; name: string; nipp: string; jabatan: string | null } | null;
  guest: { id: number; name: string; email: string } | null;
}

interface RecapGroup {
  date: string;
  dateLabel: string;
  schedules: RecapScheduleItem[];
}

interface RecapResponse {
  period: { startDate: string; endDate: string };
  scope: "mine" | "unit";
  total: number;
  reporter: {
    id: number;
    name: string;
    nipp: string;
    jabatan: string | null;
    role: string;
    unit?: { id: number; unit_name: string } | null;
  } | null;
  groups: RecapGroup[];
}

// ====== Helpers ======
const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Administrator",
  MANAJER: "Manajer",
  ASISTEN_MANAJER: "Asisten Manajer",
  SUPERVISOR: "Supervisor",
  STAFF: "Staff",
};

function formatPeriodLabel(startDate: string, endDate: string): string {
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const fmt = (s: string) => {
    const d = new Date(`${s}T00:00:00`);
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };
  if (startDate === endDate) return fmt(startDate);
  return `${fmt(startDate)} s/d ${fmt(endDate)}`;
}

// ====== Component ======
export default function RecapSchedules() {
  const { user } = useAuth();

  // Default: rentang bulan berjalan
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  const toInputDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const [startDate, setStartDate] = useState(toInputDate(firstDay));
  const [endDate, setEndDate] = useState(toInputDate(lastDay));
  const [scope, setScope] = useState<"mine" | "unit">("mine");
  const [data, setData] = useState<RecapResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<"pdf" | "txt" | null>(null);

  const handleFetch = async () => {
    setError(null);
    setIsLoading(true);
    setData(null);
    try {
      const res = await api.get<RecapResponse>("/schedules/recap", {
        params: { startDate, endDate, scope },
      });
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Gagal mengambil data rekapitulasi.");
    } finally {
      setIsLoading(false);
    }
  };

  // ====== Plaintext Export ======
  const buildPlaintext = (recap: RecapResponse): string => {
    const reporterJabatan = recap.reporter?.jabatan
      || ROLE_LABEL[recap.reporter?.role || ""]
      || "—";
    const reporterUnit = recap.reporter?.unit?.unit_name || "—";
    const reporterName = recap.reporter?.name || "—";
    const reporterNipp = recap.reporter?.nipp || "—";

    const periodLabel = formatPeriodLabel(recap.period.startDate, recap.period.endDate);

    let out = "";
    out += "Yth. Bpk Kadaop 6 Yk, Bpk Deputy 6 Yk.\n";
    out += `Berikut kami sampaikan Tentative Schedule ${reporterJabatan} ${reporterUnit}\n`;
    out += `Periode: ${periodLabel}\n\n`;

    if (recap.groups.length === 0) {
      out += "(Tidak ada jadwal pada periode ini.)\n\n";
    } else {
      for (const group of recap.groups) {
        out += `${group.dateLabel}\n`;
        for (const s of group.schedules) {
          const title = (s.notes || "Kegiatan tanpa judul").replace(/\s+/g, " ").trim();
          let line = `- ${s.time_range} : ${title}`;
          if (s.type === "TAMU" && s.guest) {
            line += ` (Tamu: ${s.guest.name})`;
          } else if (s.target_user) {
            line += ` (Bersama: ${s.target_user.name})`;
          }
          out += `${line}\n`;
        }
        out += "\n";
      }
    }

    out += "Terimakasih.\n";
    out += "Wassalam,\n";
    out += `${reporterJabatan}\n\n`;
    out += `${reporterName}\n`;
    out += `${reporterNipp}\n`;
    return out;
  };

  const exportToPlaintext = () => {
    if (!data) return;
    setIsExporting("txt");
    try {
      const text = buildPlaintext(data);
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Tentative_Schedule_${data.period.startDate}_sd_${data.period.endDate}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(null);
    }
  };

  // ====== PDF Export ======
  const exportToPDF = async () => {
    if (!data) return;
    setIsExporting("pdf");
    try {
      // Dynamic import agar bundle awal tidak besar
      const { default: jsPDF } = await import("jspdf");
      const autoTableModule: any = await import("jspdf-autotable");
      const autoTable = autoTableModule.default || autoTableModule;

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;

      // ====== Header ======
      // Logo placeholder (kotak teks "KAI")
      doc.setFillColor(15, 21, 81); // KAI Blue
      doc.rect(margin, margin, 18, 14, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("KAI", margin + 9, margin + 9, { align: "center" });

      // Header text
      doc.setTextColor(15, 21, 81);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("PT KERETA API INDONESIA (PERSERO)", margin + 22, margin + 5);
      doc.setFontSize(11);
      doc.text("DAOP 6 YOGYAKARTA", margin + 22, margin + 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text("Sistem Manajemen Penjadwalan & Buku Tamu", margin + 22, margin + 14.5);

      // Garis bawah header
      doc.setDrawColor(237, 114, 0); // KAI Orange
      doc.setLineWidth(0.6);
      doc.line(margin, margin + 18, pageWidth - margin, margin + 18);

      // ====== Title ======
      const reporterJabatan = data.reporter?.jabatan
        || ROLE_LABEL[data.reporter?.role || ""]
        || "—";
      const reporterUnit = data.reporter?.unit?.unit_name || "—";
      const periodLabel = formatPeriodLabel(data.period.startDate, data.period.endDate);

      doc.setTextColor(15, 21, 81);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("REKAPITULASI TENTATIVE SCHEDULE", pageWidth / 2, margin + 26, { align: "center" });
      doc.setFontSize(11);
      doc.text(`${reporterJabatan} - ${reporterUnit}`, pageWidth / 2, margin + 32, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(`Periode: ${periodLabel}`, pageWidth / 2, margin + 38, { align: "center" });

      // ====== Salam pembuka ======
      let cursorY = margin + 48;
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.text("Yth. Bpk Kadaop 6 Yk, Bpk Deputy 6 Yk.", margin, cursorY);
      cursorY += 5;
      doc.text("Berikut kami sampaikan rincian jadwal kegiatan sebagai berikut:", margin, cursorY);
      cursorY += 6;

      // ====== Tabel Jadwal ======
      const body: any[][] = [];
      let rowNum = 1;
      for (const group of data.groups) {
        for (const s of group.schedules) {
          let keterangan = (s.notes || "Kegiatan tanpa judul").trim();
          if (s.type === "TAMU" && s.guest) keterangan += ` (Tamu: ${s.guest.name})`;
          else if (s.target_user) keterangan += ` (Bersama: ${s.target_user.name})`;
          body.push([rowNum++, group.dateLabel, s.time_range, keterangan]);
        }
      }

      if (body.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 116, 139);
        doc.text("(Tidak ada jadwal pada periode ini.)", margin, cursorY + 4);
        cursorY += 12;
      } else {
        autoTable(doc, {
          startY: cursorY,
          head: [["No", "Hari / Tanggal", "Waktu", "Keterangan Kegiatan"]],
          body,
          theme: "grid",
          headStyles: {
            fillColor: [15, 21, 81],
            textColor: 255,
            fontStyle: "bold",
            halign: "center",
          },
          bodyStyles: { fontSize: 9, valign: "top" },
          columnStyles: {
            0: { cellWidth: 10, halign: "center" },
            1: { cellWidth: 45 },
            2: { cellWidth: 28, halign: "center" },
            3: { cellWidth: "auto" },
          },
          margin: { left: margin, right: margin },
          didDrawPage: () => {
            // Footer halaman
            const pageCount = (doc as any).internal.getNumberOfPages();
            const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
            doc.setFontSize(8);
            doc.setTextColor(120, 120, 120);
            doc.text(
              `Halaman ${currentPage} dari ${pageCount}`,
              pageWidth - margin,
              doc.internal.pageSize.getHeight() - 8,
              { align: "right" }
            );
          },
        });
        cursorY = (doc as any).lastAutoTable.finalY + 8;
      }

      // ====== Penutup & TTD ======
      const pageHeight = doc.internal.pageSize.getHeight();
      // Jika ruang sisa kurang, tambah halaman baru
      if (cursorY > pageHeight - 50) {
        doc.addPage();
        cursorY = margin + 10;
      }

      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Demikian kami sampaikan, atas perhatian Bapak/Ibu kami ucapkan terima kasih.", margin, cursorY);
      cursorY += 12;

      // Blok tanda tangan di sisi kanan
      const signX = pageWidth - margin - 70;
      doc.text("Hormat kami,", signX, cursorY);
      cursorY += 5;
      doc.text(reporterJabatan, signX, cursorY);
      cursorY += 22; // ruang TTD
      doc.setFont("helvetica", "bold");
      doc.text(data.reporter?.name || "—", signX, cursorY);
      cursorY += 5;
      doc.setFont("helvetica", "normal");
      doc.text(`NIPP: ${data.reporter?.nipp || "—"}`, signX, cursorY);

      // ====== Save ======
      doc.save(`Tentative_Schedule_${data.period.startDate}_sd_${data.period.endDate}.pdf`);
    } catch (err: any) {
      console.error("PDF export error:", err);
      alert(
        "Gagal mengekspor PDF. Pastikan paket 'jspdf' dan 'jspdf-autotable' sudah terinstall:\n\nnpm install jspdf jspdf-autotable"
      );
    } finally {
      setIsExporting(null);
    }
  };

  // ====== Render ======
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-bold text-kai-blue tracking-tight">Rekapitulasi Jadwal</h1>
        <p className="text-slate-500 mt-1">
          Buat laporan tentative schedule periodik untuk pelaporan ke level di atasnya. Hanya jadwal berstatus <span className="font-semibold">APPROVED</span> yang akan disertakan.
        </p>
      </div>

      {/* Filter Form */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Filter Periode</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Tanggal Mulai</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kai-blue focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Tanggal Selesai</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kai-blue focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Lingkup</label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as "mine" | "unit")}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kai-blue focus:border-transparent bg-white"
            >
              <option value="mine">Jadwal Saya</option>
              <option value="unit">Jadwal Seluruh Unit</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleFetch}
              disabled={isLoading || !startDate || !endDate}
              className="w-full flex items-center justify-center px-4 py-2.5 bg-[#0F1551] text-white text-sm font-medium rounded-lg hover:bg-[#1a2170] transition disabled:opacity-50 shadow-sm"
            >
              {isLoading ? (
                <><Loader2 size={16} className="mr-2 animate-spin" /> Memuat…</>
              ) : (
                <><Calendar size={16} className="mr-2" /> Muat Data</>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Reporter Info & Export Buttons */}
      {data && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2 text-slate-700">
                <span className="font-semibold">Pelapor:</span>
                <span>{data.reporter?.name || user?.name || "—"}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-500">NIPP {data.reporter?.nipp || user?.nipp || "—"}</span>
              </div>
              <div className="text-slate-500">
                <span className="font-medium">{data.reporter?.jabatan || ROLE_LABEL[data.reporter?.role || ""] || "—"}</span>
                {" · "}
                <span>{data.reporter?.unit?.unit_name || "Tanpa Unit"}</span>
              </div>
              <div className="text-slate-500">
                Periode <span className="font-medium text-slate-700">{formatPeriodLabel(data.period.startDate, data.period.endDate)}</span>
                {" · "}
                <span className="font-medium text-slate-700">{data.total}</span> jadwal {data.scope === "unit" ? "(seluruh unit)" : "(milik saya)"}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={exportToPlaintext}
                disabled={isExporting !== null}
                className="flex items-center justify-center px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
              >
                {isExporting === "txt" ? (
                  <><Loader2 size={16} className="mr-2 animate-spin" /> Memproses…</>
                ) : (
                  <><FileText size={16} className="mr-2" /> Export Plaintext</>
                )}
              </button>
              <button
                onClick={exportToPDF}
                disabled={isExporting !== null}
                className="flex items-center justify-center px-4 py-2.5 bg-[#ED7200] text-white text-sm font-medium rounded-lg hover:bg-[#cc6300] transition disabled:opacity-50 shadow-sm"
              >
                {isExporting === "pdf" ? (
                  <><Loader2 size={16} className="mr-2 animate-spin" /> Memproses…</>
                ) : (
                  <><FileDown size={16} className="mr-2" /> Export PDF</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Table */}
      {data && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Pratinjau Jadwal</h2>
            <span className="text-xs text-slate-500">
              {data.groups.length} hari, {data.total} jadwal
            </span>
          </div>

          {data.groups.length === 0 ? (
            <div className="p-12 text-center">
              <Download size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">Tidak ada jadwal APPROVED pada periode ini.</p>
              <p className="text-slate-400 text-sm mt-1">Coba ubah rentang tanggal atau lingkup data.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-3 font-semibold text-slate-600 uppercase tracking-wider text-xs w-16">No</th>
                    <th className="text-left px-6 py-3 font-semibold text-slate-600 uppercase tracking-wider text-xs">Hari / Tanggal</th>
                    <th className="text-left px-6 py-3 font-semibold text-slate-600 uppercase tracking-wider text-xs w-40">Waktu</th>
                    <th className="text-left px-6 py-3 font-semibold text-slate-600 uppercase tracking-wider text-xs">Keterangan</th>
                    <th className="text-left px-6 py-3 font-semibold text-slate-600 uppercase tracking-wider text-xs w-32">Kategori</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    let no = 1;
                    return data.groups.flatMap((group) =>
                      group.schedules.map((s, idx) => {
                        const isFirstOfDay = idx === 0;
                        return (
                          <tr key={s.id} className="hover:bg-slate-50/60">
                            <td className="px-6 py-3 text-slate-500 align-top">{no++}</td>
                            <td className="px-6 py-3 align-top">
                              {isFirstOfDay ? (
                                <span className="font-medium text-slate-800">{group.dateLabel}</span>
                              ) : (
                                <span className="text-slate-300 text-xs">↳</span>
                              )}
                            </td>
                            <td className="px-6 py-3 text-slate-700 font-mono text-xs align-top">{s.time_range}</td>
                            <td className="px-6 py-3 text-slate-700 align-top">
                              {s.notes || <span className="text-slate-400 italic">Tanpa judul</span>}
                              {s.type === "TAMU" && s.guest && (
                                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700">
                                  Tamu: {s.guest.name}
                                </span>
                              )}
                              {s.target_user && (
                                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700">
                                  Bersama: {s.target_user.name}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-3 align-top">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                                s.category === "BERSAMA" ? "bg-blue-50 text-blue-700" :
                                s.category === "UNIT" ? "bg-purple-50 text-purple-700" :
                                "bg-green-50 text-green-700"
                              }`}>
                                {s.category}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    );
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Empty state when no data fetched yet */}
      {!data && !isLoading && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 border-dashed p-12 text-center">
          <FileText size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-600 font-medium">Pilih periode lalu klik <span className="text-kai-blue">Muat Data</span></p>
          <p className="text-slate-400 text-sm mt-1">
            Hasil rekapitulasi dapat di-export ke format Plaintext (kedinasan) atau PDF.
          </p>
        </div>
      )}
    </div>
  );
}
