import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileJson,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import {
  PawasAnchor,
  Personnel,
  RosterBackupPayload,
  RosterOrgHeader,
  ScheduleRevision,
  ShiftOverrides,
  UnitKey,
} from '../types/polriRoster';
import {
  buildOperationalUpdatePayload,
  CURRENT_APP_DATA_VERSION,
  parseDataUpdateInput,
  ParsedDataUpdatePreview,
} from '../utils/appDataUpdate';
import {
  getProtectedAccountsSummary,
  ProtectedAccountsSummary,
} from '../utils/dashboardAuth';

export interface AppReleaseUpdateOptions {
  keepOverrides: boolean;
  resetModuleDrafts: boolean;
}

interface BackupRestoreViewProps {
  header: RosterOrgHeader;
  personnel: Personnel[];
  unitOrder: UnitKey[];
  pawasAnchor: PawasAnchor;
  overrides: ShiftOverrides;
  scheduleRevisions?: ScheduleRevision[];
  lastBackupAt?: string;
  hasPendingDataUpdate?: boolean;
  onMarkBackupDone: (timestamp: string) => void;
  onRestoreBackup: (data: RosterBackupPayload['data']) => void;
  onApplyAppReleaseUpdate?: (options: AppReleaseUpdateOptions) => void;
  onResetBaseline: () => void;
}

function formatReadableTime(iso?: string): string {
  if (!iso) return 'Belum pernah dicadangkan';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function BackupRestoreView({
  header,
  personnel,
  unitOrder,
  pawasAnchor,
  overrides,
  scheduleRevisions,
  lastBackupAt,
  hasPendingDataUpdate = false,
  onMarkBackupDone,
  onRestoreBackup,
  onApplyAppReleaseUpdate,
  onResetBaseline,
}: BackupRestoreViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [jsonPasteText, setJsonPasteText] = useState('');
  const [preview, setPreview] = useState<ParsedDataUpdatePreview | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // Release data update options
  const [keepOverrides, setKeepOverrides] = useState(true);
  const [resetModuleDrafts, setResetModuleDrafts] = useState(false);
  const [confirmReleaseUpdate, setConfirmReleaseUpdate] = useState(false);

  // Protected local accounts summary
  const [accountSummary, setAccountSummary] =
    useState<ProtectedAccountsSummary | null>(null);

  useEffect(() => {
    let active = true;
    void getProtectedAccountsSummary().then((summary) => {
      if (active) setAccountSummary(summary);
    });
    return () => {
      active = false;
    };
  }, []);

  const overrideCount = Object.keys(overrides).length;
  const pausedCount = personnel.filter((p) => p.dutyPaused).length;

  const buildPayload = (): RosterBackupPayload =>
    buildOperationalUpdatePayload({
      header,
      personnel,
      unitOrder,
      pawasAnchor,
      overrides,
      scheduleRevisions,
    });

  const handleDownloadBackup = () => {
    const payload = buildPayload();
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStamp = payload.exportedAt.slice(0, 10);
    a.href = url;
    a.download = `update-data-sium-selatan-${dateStamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onMarkBackupDone(payload.exportedAt);
  };

  const handleCopyBackup = async () => {
    try {
      const payload = buildPayload();
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopiedBackup(true);
      onMarkBackupDone(payload.exportedAt);
      window.setTimeout(() => setCopiedBackup(false), 2400);
    } catch {
      setParseError('Gagal menyalin paket data ke clipboard.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const parsed = parseDataUpdateInput(text);
        setPreview(parsed);
        setJsonPasteText(text);
      } catch (err) {
        setPreview(null);
        setParseError(
          err instanceof Error
            ? err.message
            : 'File update/backup gagal dibaca.'
        );
      }
    };
    reader.onerror = () => {
      setParseError('Gagal membaca file dari perangkat.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleValidatePastedText = () => {
    setParseError(null);
    try {
      const parsed = parseDataUpdateInput(jsonPasteText);
      setPreview(parsed);
    } catch (err) {
      setPreview(null);
      setParseError(
        err instanceof Error ? err.message : 'Teks JSON update/backup tidak valid.'
      );
    }
  };

  const handleConfirmRestore = () => {
    if (!preview) return;
    onRestoreBackup(preview.data);
    setPreview(null);
    setJsonPasteText('');
    setParseError(null);
  };

  const handleConfirmReleaseUpdate = () => {
    if (!onApplyAppReleaseUpdate) return;
    onApplyAppReleaseUpdate({
      keepOverrides,
      resetModuleDrafts,
    });
    setConfirmReleaseUpdate(false);
  };

  const moduleLabels = (mod?: RosterBackupPayload['data']['modules']): string[] => {
    if (!mod) return [];
    const list: string[] = [];
    if (mod.rengiat) list.push('Rengiat');
    if (mod.pam) list.push('Daftar Pers PAM');
    if (mod.buatSprinActive || mod.buatSprinArchive) list.push('BUAT SPRIN & Arsip');
    if (typeof mod.dailyWaPhone === 'string' && mod.dailyWaPhone) {
      list.push('No. WA Harian');
    }
    return list;
  };

  return (
    <div className="space-y-6">
      {/* Protected Accounts & Passwords Guarantee Banner */}
      <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 dark:border-emerald-700/60 dark:bg-emerald-950/35 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h2 className="text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-200">
              Perlindungan User &amp; Password Aplikasi Terinstal Aktif
            </h2>
            <p className="text-xs text-emerald-900/90 dark:text-emerald-300/90 leading-relaxed">
              Seluruh fitur <strong>Terapkan Update Data</strong>,{' '}
              <strong>Pulihkan Backup</strong>, maupun{' '}
              <strong>Reset Data Standar</strong> hanya memperbarui data
              operasional (Personel, Jadwal, Kop Surat, Rengiat, PAM, Sprin).{' '}
              <strong>
                User dan password Admin maupun Pengguna yang sudah tersimpan di
                aplikasi terinstal tidak akan ikut diupdate atau tertimpa.
              </strong>
            </p>
          </div>
        </div>
        {accountSummary && (
          <div className="shrink-0 rounded-lg border border-emerald-300 bg-white/90 dark:border-emerald-700/60 dark:bg-[#13100c] px-3 py-2 text-xs">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-400">
              Akun Terlindungi
            </div>
            <div className="font-mono tabular-nums font-bold text-slate-900 dark:text-[#f3ede4] mt-0.5">
              {accountSummary.total} Akun ({accountSummary.adminCount} Admin ·{' '}
              {accountSummary.userCount} User)
            </div>
          </div>
        )}
      </div>

      {/* Current Data Snapshot */}
      <div className="bg-white dark:bg-[#1a1611] border border-slate-200 dark:border-[#2e261d] rounded-xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-[#2e261d]">
        <div className="px-5 py-4">
          <p className="text-xs font-medium text-slate-500 dark:text-[#9b8f80]">
            Total Personel
          </p>
          <p className="mt-1 text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-[#f3ede4]">
            {personnel.length}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-[#9b8f80]">
            {pausedCount} tidak piket sementara
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs font-medium text-slate-500 dark:text-[#9b8f80]">
            Edit Shift Manual
          </p>
          <p className="mt-1 text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-[#f3ede4]">
            {overrideCount}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-[#9b8f80]">
            Perubahan sel di matriks
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs font-medium text-slate-500 dark:text-[#9b8f80]">
            Satuan Aktif
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-[#f3ede4] truncate">
            {header.line3}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-[#9b8f80] truncate">
            {header.signerName}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs font-medium text-slate-500 dark:text-[#9b8f80]">
            Backup / Paket Update
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-[#f3ede4]">
            {formatReadableTime(lastBackupAt)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-[#9b8f80]">
            Versi data: {CURRENT_APP_DATA_VERSION}
          </p>
        </div>
      </div>

      {/* Terapkan Update Data Bawaan Aplikasi (Tanpa Ubah User & Password) */}
      {onApplyAppReleaseUpdate && (
        <section
          className={`rounded-xl border p-5 space-y-4 ${
            hasPendingDataUpdate
              ? 'bg-amber-50/70 border-amber-300 dark:bg-[#241d12] dark:border-[#8d6b38]'
              : 'bg-white border-slate-200 dark:bg-[#1a1611] dark:border-[#2e261d]'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#9a6b24] dark:text-[#dfb365]" />
                <h2 className="text-base font-semibold text-slate-900 dark:text-[#f3ede4]">
                  Terapkan Update Data Versi Aplikasi ({CURRENT_APP_DATA_VERSION})
                </h2>
                {hasPendingDataUpdate && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded bg-amber-200 text-amber-950 dark:bg-[#8d6b38] dark:text-[#fff6e5]">
                    Update Tersedia
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-[#b8aa97] leading-relaxed">
                Perbarui data master aplikasi (daftar 58 personel terbaru, susunan
                PAWAS, kop surat, dan jadwal standar) ke rilis aplikasi terbaru{' '}
                <strong>
                  tanpa mengubah user maupun password Admin dan Pengguna yang
                  tersimpan di aplikasi ini
                </strong>
                .
              </p>
            </div>

            {!confirmReleaseUpdate ? (
              <button
                type="button"
                onClick={() => setConfirmReleaseUpdate(true)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#a6783e] hover:bg-[#b88647] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Terapkan Update Data</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setConfirmReleaseUpdate(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 dark:text-[#d6cec2] dark:bg-[#1f1912] dark:border-[#3a2f20] rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReleaseUpdate}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg whitespace-nowrap"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ya, Terapkan Sekarang</span>
                </button>
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-3 pt-1">
            <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white/80 dark:border-[#32291d] dark:bg-[#13100c] p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={keepOverrides}
                onChange={(e) => setKeepOverrides(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <span className="text-xs text-slate-700 dark:text-[#d6cec2]">
                <strong className="block text-slate-900 dark:text-[#f3ede4]">
                  Pertahankan edit shift manual di matriks
                </strong>
                Riwayat perubahan sel piket yang sudah dibuat sebelumnya tetap
                dipertahankan setelah update data.
              </span>
            </label>

            <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white/80 dark:border-[#32291d] dark:bg-[#13100c] p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={resetModuleDrafts}
                onChange={(e) => setResetModuleDrafts(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <span className="text-xs text-slate-700 dark:text-[#d6cec2]">
                <strong className="block text-slate-900 dark:text-[#f3ede4]">
                  Segarkan draf Rengiat, PAM &amp; BUAT SPRIN ke bawaan
                </strong>
                Kosongkan jika ingin mempertahankan catatan Rengiat, PAM, dan
                arsip surat yang sudah ada.
              </span>
            </label>
          </div>
        </section>
      )}

      {/* Export Backup / Update Package Card */}
      <section className="bg-white dark:bg-[#1a1611] border border-slate-200 dark:border-[#2e261d] rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-[#f3ede4]">
                Buat Paket Update Data / Cadangkan (.json)
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#9b8f80]">
              Ekspor seluruh data operasional (personel, urutan unit, kop surat,
              titik mulai PAWAS, edit shift manual, Rengiat, Daftar Pers PAM,
              serta arsip BUAT SPRIN) ke satu file{' '}
              <span className="font-mono">.json</span> untuk dibagikan ke
              perangkat lain. <strong>User &amp; password tidak ikut diekspor</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyBackup}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 dark:text-[#e6dfd3] dark:bg-[#1f1912] dark:border-[#3a2f20] dark:hover:bg-[#2a2217] rounded-lg transition-colors whitespace-nowrap"
            >
              {copiedBackup ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>JSON Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Teks Update</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadBackup}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh File Update Data (.json)</span>
            </button>
          </div>
        </div>
      </section>

      {/* Apply Update Data / Restore Backup Card */}
      <section className="bg-white dark:bg-[#1a1611] border border-slate-200 dark:border-[#2e261d] rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-[#f3ede4]">
                Terapkan Update Data dari File / Pulihkan Backup
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#9b8f80]">
              Pilih file <span className="font-mono">.json</span> hasil ekspor
              atau tempel teks JSON di bawah untuk menerapkan pembaruan data ke
              aplikasi ini{' '}
              <strong>
                tanpa mengubah akun &amp; password Admin/Pengguna yang tersimpan
              </strong>
              .
            </p>
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 dark:text-[#f3ede4] dark:bg-[#241d15] dark:hover:bg-[#2e251a] dark:border-[#382e22] rounded-lg transition-colors whitespace-nowrap"
            >
              <FileJson className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Pilih File Update / Backup (.json)</span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="backup-json-input"
            className="block text-xs font-medium text-slate-600 dark:text-[#b8aa97]"
          >
            Atau Tempel Teks JSON Update Data di Sini:
          </label>
          <textarea
            id="backup-json-input"
            rows={4}
            value={jsonPasteText}
            onChange={(e) => {
              setJsonPasteText(e.target.value);
              setPreview(null);
              setParseError(null);
            }}
            placeholder='{"app":"kuat-pers-jadwal-piket","version":2,"excludesAuthAccounts":true,...}'
            className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 text-slate-900 dark:bg-[#13100c] dark:border-[#32291d] dark:text-[#f3ede4] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!jsonPasteText.trim()}
              onClick={handleValidatePastedText}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 dark:text-[#e6dfd3] dark:bg-[#1f1912] dark:border-[#3a2f20] rounded-lg disabled:opacity-40 disabled:pointer-events-none"
            >
              Periksa &amp; Pratinjau Update Data
            </button>
          </div>
        </div>

        {parseError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 dark:bg-red-950/50 dark:border-red-700/60 dark:text-red-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>{parseError}</span>
          </div>
        )}

        {preview && (
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 dark:bg-blue-950/35 dark:border-blue-700/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-blue-950 dark:text-blue-200">
                  Paket Update Data Siap Diterapkan
                </h3>
                <p className="text-xs text-blue-800 dark:text-blue-300 mt-0.5">
                  Waktu ekspor: {formatReadableTime(preview.exportedAt)} ·
                  Satuan: <strong>{preview.data.header.line3}</strong>
                  {preview.dataVersion ? ` · Versi ${preview.dataVersion}` : ''}
                </p>
              </div>
              <div className="font-mono text-xs text-blue-900 dark:text-blue-200">
                {preview.data.personnel.length} personel ·{' '}
                {Object.keys(preview.data.overrides).length} edit manual
              </div>
            </div>

            {moduleLabels(preview.data.modules).length > 0 && (
              <div className="text-xs text-blue-900 dark:text-blue-200">
                Modul ikut diperbarui:{' '}
                <strong>{moduleLabels(preview.data.modules).join(', ')}</strong>
              </div>
            )}

            <div className="rounded-lg border border-emerald-300 bg-emerald-50/90 dark:border-emerald-700/60 dark:bg-emerald-950/40 px-3 py-2 text-xs text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
              <span>
                User dan password Admin &amp; Pengguna yang tersimpan di
                perangkat ini{' '}
                <strong>tidak akan ikut diupdate</strong>.
                {preview.strippedAuthFieldCount > 0 &&
                  ` (${preview.strippedAuthFieldCount} bidang akun di file sumber otomatis diabaikan.)`}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 dark:text-[#d6cec2] dark:bg-[#1f1912] dark:border-[#3a2f20] rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                Terapkan Update Data
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Safe Reset to Baseline */}
      <section className="bg-white dark:bg-[#1a1611] border border-slate-200 dark:border-[#2e261d] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-[#f3ede4]">
            Kembalikan Data Jadwal ke Standar Awal
          </h3>
          <p className="text-xs text-slate-500 dark:text-[#9b8f80]">
            Memuat ulang data jadwal standar awal 58 personel tanpa mengubah
            user maupun password Admin dan Pengguna yang tersimpan.
          </p>
        </div>

        {!confirmReset ? (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 dark:text-red-300 dark:bg-red-950/40 dark:border-red-700/50 dark:hover:bg-red-950/70 rounded-lg whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Jadwal ke Data Awal</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 dark:text-[#d6cec2] dark:bg-[#1f1912] dark:border-[#3a2f20] rounded-lg"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => {
                onResetBaseline();
                setConfirmReset(false);
              }}
              className="px-3.5 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
            >
              Ya, Reset Sekarang
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

