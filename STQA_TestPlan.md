# STQA Test Plan — KAI DAOP 6 Schedule Management System

**Versi**: 1.0
**Tanggal**: 2026-05-24
**Stack**: Vite + React + TypeScript (frontend) · Express + Prisma + MySQL (backend)
**Base URL**: `http://localhost:5173` (client) · `http://localhost:5000` (server)

---

## 1. Tujuan

Memastikan seluruh fitur sistem manajemen penjadwalan KAI DAOP 6 bekerja sesuai spesifikasi sebelum production rollout, dengan fokus pada:

- **Functional correctness** — alur user dari ujung-ke-ujung sesuai spec
- **Role-Based Access Control (RBAC)** — hak akses tidak bocor
- **Data integrity** — tidak ada duplikasi, race condition, atau data corrupt
- **UX consistency** — visual, validasi, dan feedback ke user konsisten

---

## 2. Strategi Pengujian

| Level | Metode | Cakupan |
|---|---|---|
| **Smoke** | Manual cepat | Login + akses halaman utama per role |
| **Functional** | Test case per fitur | Alur happy path & validasi |
| **Integration** | API + UI gabungan | Workflow approval lintas role |
| **Edge/Negative** | Test case spesifik | Bentrok, double-submit, 403, validasi field |
| **UAT** | User-driven scenario | End-user simulation (manajer, staff) |

### Klasifikasi Severity Bug

| Level | Definisi | Contoh |
|---|---|---|
| **P1 — Critical** | Sistem tidak bisa dipakai, data hilang, security breach | Login gagal total, RBAC bocor |
| **P2 — High** | Fitur utama tidak berfungsi, ada workaround | Tombol Approve gagal, notifikasi tidak muncul |
| **P3 — Medium** | Fitur sekunder bermasalah, UX terganggu | Badge salah warna, label typo |
| **P4 — Low** | Cosmetic, edge case langka | Spacing modal, hint tidak ideal |

---

## 3. Persiapan Test Environment

### Prerequisite
- ✅ `npx prisma db push` sudah dijalankan (semua kolom terbaru ada di DB)
- ✅ Backend running (`npm run dev` di `server/`) → port 5000
- ✅ Frontend running (`npm run dev` di `client/`) → port 5173
- ✅ Akun uji tersedia untuk **setiap role**: SUPER_ADMIN, MANAJER, ASISTEN_MANAJER, SUPERVISOR, STAFF
- ✅ Minimal 1 Unit terdaftar (untuk testing kategori UNIT)

### Test Data Plan
Untuk reproduksi bug yang konsisten, sebaiknya siapkan:
- 2 user STAFF di unit yang sama (untuk testing UNIT scope)
- 1 user STAFF di unit berbeda (untuk testing cross-unit visibility)
- Beberapa jadwal sample dengan kombinasi status: PENDING, APPROVED, RESCHEDULED, REJECTED
- Beberapa jadwal lampau dengan realisasi: SESUAI, TIDAK_SESUAI

---

## 4. Test Suites

### 4.1 — Authentication & Session

| ID | Description | Steps | Expected | Priority |
|---|---|---|---|---|
| TC-AUTH-01 | Login dengan email + password benar | 1. Buka /login<br>2. Isi email & password valid<br>3. Submit | Redirect ke /dashboard, JWT tersimpan di localStorage | P1 |
| TC-AUTH-02 | Login dengan NIPP + password benar | Sama, tapi pakai NIPP | Berhasil login | P1 |
| TC-AUTH-03 | Login dengan password salah | Submit password salah | Pesan error "NIPP atau Kata Sandi salah", tetap di /login | P1 |
| TC-AUTH-04 | Login akun status PENDING | Submit akun yang baru register (belum di-approve) | Error 403 "Akun PENDING, silakan hubungi admin" | P1 |
| TC-AUTH-05 | Akses /dashboard tanpa token | Buka /dashboard di incognito | Redirect ke /login | P1 |
| TC-AUTH-06 | Token expired | Manual edit localStorage token jadi invalid → reload | Auto-logout & redirect /login | P2 |
| TC-AUTH-07 | Register akun baru | Submit form register lengkap | Akun tersimpan dengan status PENDING, message sukses | P1 |
| TC-AUTH-08 | Register duplicate NIPP | Submit dengan NIPP yang sudah ada | Error 409 "NIPP sudah terdaftar" | P2 |
| TC-AUTH-09 | Logout | Klik tombol Logout di sidebar | localStorage clear, redirect /login | P1 |

---

### 4.2 — Role-Based Access Control (RBAC)

| ID | Description | Role | Steps | Expected | Priority |
|---|---|---|---|---|---|
| TC-RBAC-01 | Sidebar items per role | STAFF | Login → lihat sidebar | Hanya: Beranda, Persetujuan Jadwal, Pengaturan | P1 |
| TC-RBAC-02 | Sidebar admin items | MANAJER | Login → lihat sidebar | + Manajemen Pegawai, Manajemen Unit, Rekapitulasi Jadwal | P1 |
| TC-RBAC-03 | Akses `/admin/users` sebagai staff | STAFF | Navigate langsung | Redirect ke /dashboard atau 403 | P1 |
| TC-RBAC-04 | Endpoint `/users` sebagai staff | STAFF | GET /api/users | 403 Forbidden | P1 |
| TC-RBAC-05 | Endpoint `/schedules/pending` sebagai staff | STAFF | GET via API | 403 Forbidden (tidak auto-logout) | P1 |
| TC-RBAC-06 | Endpoint `/schedules/change-requests/pending` sebagai staff | STAFF | GET via API | 403 Forbidden | P1 |
| TC-RBAC-07 | Halaman Persetujuan Jadwal untuk staff | STAFF | Buka /admin/schedules | Section "Menunggu Persetujuan Admin" TIDAK muncul, section "Undangan Meeting" muncul | P2 |
| TC-RBAC-08 | Menu Rekapitulasi untuk staff | STAFF | Buka /admin/recap | Tidak muncul di sidebar; akses langsung URL → redirect | P2 |

---

### 4.3 — Schedule Creation (POST /schedules)

| ID | Description | Steps | Expected | Priority |
|---|---|---|---|---|
| TC-CREATE-01 | Jadwal PRIBADI sederhana (SELF) | Pilih SELF, isi judul, hari ini 09:00-10:00, kategori PRIBADI | Schedule tersimpan, status APPROVED (untuk pribadi/unit) | P1 |
| TC-CREATE-02 | Default tanggal hari ini | Buka modal tambah jadwal | Tanggal Mulai & Selesai = hari ini | P2 |
| TC-CREATE-03 | Auto-sync tanggal selesai | Ubah Tanggal Mulai ke besok | Tanggal Selesai otomatis ikut ke besok | P2 |
| TC-CREATE-04 | Override tanggal selesai (multi-hari) | Set Mulai 20 Mei, lalu ubah Selesai jadi 22 Mei | Selesai tetap 22 Mei (tidak di-override) | P2 |
| TC-CREATE-05 | Jadwal SELF bentrok | Buat jadwal di slot waktu yang sudah punya jadwal APPROVED | Error 400 "Waktu ini sudah terisi" | P1 |
| TC-CREATE-06 | Jadwal di luar jam kerja | Pilih jam 19:00-20:00 | Muncul confirm "di luar jam kerja, yakin?", lanjut kalau OK | P2 |
| TC-CREATE-07 | Kategori PRIBADI saat actionType=SELF | Pilih SELF + PRIBADI | Berhasil, opsi PRIBADI muncul | P2 |
| TC-CREATE-08 | Kategori PRIBADI saat actionType=MEETING | Pilih MEETING dengan kategori awal PRIBADI | Opsi PRIBADI hilang dari dropdown, auto-switch ke UNIT | P2 |
| TC-CREATE-09 | Group MEETING dengan multi-invite | Pilih MEETING, checkbox 3 pegawai, submit | Schedule tersimpan dengan status PENDING, 3 row di ScheduleParticipant | P1 |
| TC-CREATE-10 | Mass invite "Semua Manajer" | Klik tombol pill "Pilih Semua Manajer" | Hanya user dengan role MANAJER tercentang (bukan ASISTEN_MANAJER) | P2 |
| TC-CREATE-11 | DELEGATION hierarki | Login STAFF, pilih DELEGATION | Dropdown atasan hanya tampilkan role weight >= STAFF (SUPERVISOR ke atas) | P2 |
| TC-CREATE-12 | DELEGATION ke peer | Login MANAJER, pilih DELEGATION | Dropdown tampilkan MANAJER lain + SUPER_ADMIN | P2 |
| TC-CREATE-13 | Reschedule dari TIDAK_SESUAI | Modal buka → dropdown auto-fetch → pilih jadwal lama | Field Judul & Kategori terisi otomatis dari jadwal terpilih | P2 |
| TC-CREATE-14 | Recurring weekly 4 kali | Centang "Jadwal Berulang", WEEKLY, end_date = +28 hari | Backend bikin ~5 jadwal dengan recurrenceGroupId sama | P1 |
| TC-CREATE-15 | Recurring dengan bentrok parsial | Salah satu occurrence bentrok dengan jadwal lain | Bentrok diskip, sisanya tersimpan, message info skipped | P2 |
| TC-CREATE-16 | Recurring max 100 occurrences | Set DAILY dari Jan-Dec | Capped di 100, response info | P3 |

---

### 4.4 — Approval Workflows

#### 4.4.1 Group Meeting (PARTICIPANT)

| ID | Description | Steps | Expected | Priority |
|---|---|---|---|---|
| TC-APPROVE-01 | Invitee terima undangan single | Staff B buka /dashboard → widget IncomingSchedules → klik Terima | Status ScheduleParticipant Staff B = APPROVED | P1 |
| TC-APPROVE-02 | Invitee tolak dengan catatan | Klik Tolak → modal note muncul → isi alasan → submit | Status REJECTED, responseNote tersimpan | P1 |
| TC-APPROVE-03 | Invitee reschedule request | Klik Reschedule → modal note (wajib) → submit | Status RESCHEDULED, responseNote tersimpan | P2 |
| TC-APPROVE-04 | Bulk approval recurring | Staff diundang ke meeting WEEKLY x 5 → klik Terima 1x | Semua 5 ScheduleParticipant.status = APPROVED, message "5 jadwal rutin disetujui" | P1 |
| TC-APPROVE-05 | Bulk approval dengan bentrok parsial | 1 dari 5 occurrence bentrok dengan jadwal APPROVED user | 4 disetujui, 1 dilewati, message info | P2 |
| TC-APPROVE-06 | Approve dengan bentrok | User punya jadwal APPROVED di waktu yang sama → klik Terima | Error 400 "Jadwal bentrok…" | P1 |
| TC-APPROVE-07 | Badge "Jadwal Rutin" tampil | Group meeting recurring di widget | Badge "Rutin Mingguan/Bulanan" muncul | P2 |
| TC-APPROVE-08 | Auto-elevate main schedule | Semua participant approve 1 schedule | main Schedule.status otomatis naik ke APPROVED | P1 |

#### 4.4.2 Admin Approval (Schedule.status PENDING)

| ID | Description | Steps | Expected | Priority |
|---|---|---|---|---|
| TC-APPROVE-09 | Admin approve BERSAMA non-admin | Staff bikin BERSAMA → admin klik Setujui | status APPROVED, muncul di kalender semua user | P1 |
| TC-APPROVE-10 | Admin reject BERSAMA | Klik Tolak | status REJECTED, block merah-transparan di kalender creator | P1 |
| TC-APPROVE-11 | Section Admin Queue HIDE untuk non-admin | STAFF buka /admin/schedules | Section "Menunggu Persetujuan Admin" tidak muncul, tapi section "Undangan" tampil | P2 |

---

### 4.5 — Realisasi Kegiatan

| ID | Description | Steps | Expected | Priority |
|---|---|---|---|---|
| TC-REAL-01 | Form realisasi tidak muncul untuk PENDING | Klik jadwal PENDING di kalender | Section Realisasi: "Belum bisa diisi — jadwal belum APPROVED" | P2 |
| TC-REAL-02 | Form realisasi tidak muncul untuk APPROVED tapi belum selesai | Klik jadwal APPROVED yang end_time > now | Section Realisasi: "Belum bisa diisi — kegiatan belum selesai" | P2 |
| TC-REAL-03 | Form muncul setelah event selesai | Klik jadwal APPROVED + end_time < now | Form dengan radio Sesuai/Tidak Sesuai + textarea | P1 |
| TC-REAL-04 | Submit realisasi SESUAI tanpa catatan | Pilih Sesuai, kosongkan textarea, Simpan | Tersimpan, badge hijau "Sesuai" muncul | P1 |
| TC-REAL-05 | Submit realisasi TIDAK_SESUAI dengan catatan | Pilih Tidak Sesuai, isi alasan, Simpan | Tersimpan, badge merah, block kalender berubah merah solid | P1 |
| TC-REAL-06 | Read-only setelah diisi + tombol Ubah | Klik jadwal yang sudah diisi realisasi | Badge tampil, tombol "Ubah" muncul untuk owner/admin | P2 |
| TC-REAL-07 | Non-owner non-admin tidak bisa isi | Login STAFF lain, klik jadwal | "Belum diisi oleh pemilik jadwal" (read-only) | P2 |
| TC-REAL-08 | Validasi backend reject status invalid | API call dengan realizationStatus="XYZ" | 400 Bad Request | P3 |

---

### 4.6 — Change Request (Edit/Delete RBAC)

| ID | Description | Role | Steps | Expected | Priority |
|---|---|---|---|---|---|
| TC-CR-01 | Tombol Edit/Hapus muncul untuk creator (STAFF) | STAFF | Klik jadwal milik sendiri | Tombol "Ajukan Edit" & "Ajukan Hapus" muncul | P1 |
| TC-CR-02 | Tombol Edit/Hapus hidden untuk non-creator (STAFF) | STAFF | Klik jadwal BERSAMA orang lain | Hanya tombol "Tutup" muncul, footer full-width | P1 |
| TC-CR-03 | Tombol selalu muncul untuk MANAJER | MANAJER | Klik jadwal staff orang lain | Tombol "Edit" & "Hapus" muncul (direct execute) | P1 |
| TC-CR-04 | Direct edit oleh MANAJER | MANAJER | Klik Edit → ubah judul → "Simpan Langsung" | Schedule langsung ter-update di DB & kalender refresh | P1 |
| TC-CR-05 | Submit pengajuan EDIT oleh STAFF | STAFF | Klik Ajukan Edit → ubah field + isi catatan → submit | Schedule asli UTUH, ScheduleChangeRequest baru status PENDING | P1 |
| TC-CR-06 | Pengajuan EDIT tanpa catatan | STAFF | Submit tanpa isi catatan | Validasi frontend: "Catatan untuk Atasan wajib" | P2 |
| TC-CR-07 | Direct delete oleh MANAJER | MANAJER | Klik Hapus → confirm | Jadwal hilang dari DB & kalender | P1 |
| TC-CR-08 | Submit pengajuan DELETE oleh STAFF | STAFF | Klik Ajukan Hapus → confirm → isi alasan | Schedule asli UTUH, CR baru type=DELETE status=PENDING | P1 |
| TC-CR-09 | Cegah double-submit CR | Submit CR kedua untuk schedule yang sudah ada CR PENDING | 400 "Sudah ada pengajuan yang menunggu" | P2 |
| TC-CR-10 | Manajer approve EDIT request | MANAJER buka /admin/schedules → section CR → Terima | Schedule ter-update dengan proposed fields, CR status APPROVED | P1 |
| TC-CR-11 | Manajer reject EDIT request | Klik Tolak → isi alasan | Schedule UTUH, CR status REJECTED, reviewNote tersimpan | P1 |
| TC-CR-12 | Manajer approve DELETE request | Klik Terima pada CR type=DELETE | Schedule hilang dari DB (cascade hapus CR), message sukses | P1 |
| TC-CR-13 | Manajer reject DELETE request | Klik Tolak | Schedule UTUH, CR status REJECTED | P1 |
| TC-CR-14 | Diff display di card CR | Pengaju EDIT ubah judul + jam | Card admin tampilkan diff "Judul: X → Y", "Mulai: A → B" | P2 |
| TC-CR-15 | Backend tolak CR dari non-owner | STAFF coba ajukan CR untuk jadwal yang bukan miliknya (via API langsung) | 403 Forbidden | P1 |

---

### 4.7 — Calendar UI & Pewarnaan Dinamis

| ID | Description | Steps | Expected | Priority |
|---|---|---|---|---|
| TC-CAL-01 | Warna default kategori | Buat jadwal kategori BERSAMA, UNIT, PRIBADI | Block masing-masing biru, ungu, hijau | P2 |
| TC-CAL-02 | Status PENDING transparan | Jadwal PENDING di kalender | Block abu-abu transparan (45% alpha) | P2 |
| TC-CAL-03 | Status RESCHEDULED transparan | Jadwal RESCHEDULED | Block amber transparan | P2 |
| TC-CAL-04 | Realisasi TIDAK_SESUAI = merah solid | Jadwal dengan realizationStatus=TIDAK_SESUAI | Block merah solid (#dc2626) di SEMUA tab | P1 |
| TC-CAL-05 | Tab "Jadwal Saya" filter | Buka tab PRIBADI | Tampil: jadwal milik sendiri + target meeting + APPROVED participant | P1 |
| TC-CAL-06 | Tab "Jadwal Unit" filter | Buka tab UNIT | Hanya jadwal category=UNIT | P2 |
| TC-CAL-07 | Tab "Jadwal Tidak Sesuai" filter | Buka tab TIDAK_SESUAI | Hanya jadwal dengan realizationStatus=TIDAK_SESUAI + notes terisi | P1 |
| TC-CAL-08 | Group meeting muncul di kalender invitee setelah accept | Staff B accept undangan → buka kalender PRIBADI | Schedule muncul di tab Jadwal Saya | P1 |
| TC-CAL-09 | Modal detail scrollable saat konten panjang | Klik jadwal dengan peserta banyak + realisasi terisi | Modal max-h-[90vh], body scrollable, header & footer fixed | P2 |
| TC-CAL-10 | Badge "Sudah dijadwalkan ulang" | Klik jadwal TIDAK_SESUAI yang sudah pernah di-reschedule | Badge biru "Sudah dijadwalkan ulang" muncul di section Realisasi | P3 |
| TC-CAL-11 | Legenda kontekstual | Switch ke tab TIDAK_SESUAI | Legenda berubah: hilangkan kategori standar, tampilkan hint khusus | P3 |

---

### 4.8 — Notification Bell

| ID | Description | Steps | Expected | Priority |
|---|---|---|---|---|
| TC-NOTIF-01 | Badge count akurat | Punya 3 undangan PENDING | Badge merah "3" muncul di lonceng | P1 |
| TC-NOTIF-02 | Badge "9+" saat > 9 | Punya 15 undangan | Badge "9+" | P3 |
| TC-NOTIF-03 | Dropdown max 5 item | Punya 7 undangan | Dropdown tampilkan 5 teratas + link "Lihat semua" | P2 |
| TC-NOTIF-04 | Click outside close dropdown | Buka dropdown → klik area kosong | Dropdown tertutup | P2 |
| TC-NOTIF-05 | Refresh saat dropdown dibuka | Action di widget IncomingSchedules → buka bell | Badge count update tanpa reload halaman | P2 |
| TC-NOTIF-06 | Label "Rutin Mingguan" untuk recurring | Punya undangan group meeting recurring | Badge "Rutin Mingguan" muncul di item | P3 |

---

### 4.9 — Rekapitulasi & Export

| ID | Description | Steps | Expected | Priority |
|---|---|---|---|---|
| TC-RECAP-01 | Akses /admin/recap untuk MANAJER | Login MANAJER → klik menu | Halaman terbuka, default rentang bulan berjalan | P2 |
| TC-RECAP-02 | Akses untuk STAFF (denied) | Login STAFF → akses URL langsung | Redirect /dashboard | P2 |
| TC-RECAP-03 | Filter & Muat Data | Pilih rentang → klik Muat Data | Tabel pratinjau muncul, group per tanggal | P2 |
| TC-RECAP-04 | Export Plaintext | Klik Export Plaintext | File `.txt` download, format kedinasan benar (Yth. Bpk Kadaop 6 Yk, dst di baris baru) | P1 |
| TC-RECAP-05 | Export PDF | Klik Export PDF | File `.pdf` download dengan header KAI, tabel rapi, blok TTD | P2 |
| TC-RECAP-06 | Scope=unit untuk MANAJER | Pilih scope "Jadwal Seluruh Unit" | Tampil jadwal seluruh anggota unit, bukan hanya sendiri | P2 |

---

### 4.10 — Landing Page & UI/UX

| ID | Description | Steps | Expected | Priority |
|---|---|---|---|---|
| TC-UI-01 | Landing page hero full-screen | Buka / | Hero 100vh, footer di luar viewport awal | P3 |
| TC-UI-02 | Scroll reveal footer | Scroll ke bawah | Footer muncul dengan efek backdrop-blur | P3 |
| TC-UI-03 | Logo KAI muncul di hero | Buka / | Logo berwarna terlihat | P3 |
| TC-UI-04 | Logo di login form | Buka /login | Logo putih ukuran kecil di header form | P3 |
| TC-UI-05 | Sidebar logo | Login | Logo putih ukuran kecil di sidebar | P3 |
| TC-UI-06 | Responsive sidebar di mobile | Resize viewport ke 375px | (TBD — apakah sidebar collapse?) | P3 |

---

## 5. Test Execution Plan

Saran urutan eksekusi:

1. **Pass 1 — Smoke** (15 menit): TC-AUTH-01, TC-AUTH-09, TC-RBAC-01-02
2. **Pass 2 — Critical Path** (1 jam): semua P1 di section 4.3 (Create), 4.4 (Approve), 4.5 (Realisasi), 4.6 (CR)
3. **Pass 3 — RBAC & Security** (30 menit): semua P1 di section 4.2
4. **Pass 4 — UI & Calendar** (30 menit): section 4.7
5. **Pass 5 — Edge cases** (30 menit): P2/P3 di semua section

---

## 6. Bug Report Template

```markdown
**Bug ID**: BUG-001
**Severity**: P1 / P2 / P3 / P4
**Test Case**: TC-XXX-XX
**Reproduksi**:
  1. Login sebagai [role]
  2. Klik [tombol]
  3. ...
**Expected**: ...
**Actual**: ...
**Screenshot/Log**: ...
**Environment**: Chrome v123 / Windows 11 / dev
```

---

## 7. Acceptance Criteria

Sistem dianggap **lolos STQA** jika:

- ✅ **100% P1 PASSED** (tidak boleh ada bug critical)
- ✅ **≥ 95% P2 PASSED**
- ✅ **≥ 80% P3 PASSED** (boleh ada minor cosmetic)
- ⚠️ P4 tidak menghalangi production, dicatat untuk backlog

---

## 8. Out of Scope

Hal-hal berikut **tidak diuji** di STQA ini (untuk dirjadwalkan terpisah):

- Load / performance test (500+ concurrent users)
- Cross-browser test selain Chrome (Firefox, Safari, Edge)
- Mobile native (PWA / app)
- Penetration test / security audit mendalam
- Backup & disaster recovery
- Database migration rollback

---

**Catatan**: Test plan ini akan diupdate seiring penemuan fitur baru atau bug regresi. Maintained by tim development.
