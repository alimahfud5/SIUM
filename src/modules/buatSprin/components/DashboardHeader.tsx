import React from 'react';
import {
  ArrowLeft,
  FileDown,
  FileSignature,
  Loader2,
  Printer,
  Save,
} from 'lucide-react';
import { ThemeToggleButton } from '../../../components/ThemeToggleButton';

interface DashboardHeaderProps {
  onBackToDashboard?: () => void;
  onSaveToArchive: () => void;
  onExportWord: () => void;
  onExportPdf: () => void;
  isExportingPdf?: boolean;
  onPrint: () => void;
  completionPercent: number;
  activeDocNumber: string;
  pageCount: number;
  useLampiran: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onBackToDashboard,
  onSaveToArchive,
  onExportWord,
  onExportPdf,
  isExportingPdf = false,
  onPrint,
  completionPercent,
  activeDocNumber,
  pageCount,
  useLampiran,
}) => {
  return (
    <header className="no-print sticky top-0 z-30 bg-[#f8f6f1] text-slate-900 border-b border-[#ddd4c4] dark:bg-[#1a1611] dark:text-[#f3ede4] dark:border-[#2e261d]">
      <div className="w-full px-3 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Unified Active-Menu Bar matching main app */}
        <div className="flex items-center gap-2.5 min-w-0">
          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              title="Kembali ke Dashboard Utama"
              aria-label="Kembali ke Dashboard Utama"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-[#8f5f16] hover:bg-amber-50 hover:border-[#b37b24] dark:border-[#4A3D2C] dark:bg-[#241C14] dark:text-[#F4C94D] dark:hover:bg-[#2F251A] dark:hover:border-[#D4A017] text-xs font-semibold transition-colors shrink-0 cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Dashboard Utama</span>
              <span className="sm:hidden">Dashboard</span>
            </button>
          )}

          <div className="flex items-center gap-2 min-w-0 pl-2 border-l border-[#ddd4c4] dark:border-[#32291d]">
            <FileSignature className="w-4 h-4 text-[#9a6b24] dark:text-[#dfb365] shrink-0" />
            <span className="text-xs sm:text-sm font-bold tracking-wide text-slate-900 dark:text-[#f5efe6] truncate">
              BUAT SPRIN
            </span>
            <span className="hidden md:inline-block font-mono-num text-[11px] text-[#8f5f16] bg-white border border-[#ddd4c4] dark:text-[#cbb899] dark:bg-[#241d15] dark:border-[#382e22] px-2 py-0.5 rounded truncate max-w-[230px]">
              {activeDocNumber || 'Draft Baru'}
            </span>
            <span className="hidden xl:inline-block font-mono-num text-[11px] text-slate-500 dark:text-[#9b8f80] whitespace-nowrap">
              · {pageCount} Hal ({useLampiran ? 'Lampiran' : 'Tanpa Lampiran'})
            </span>
          </div>
        </div>

        {/* Right: Document Export & Save Actions */}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={onSaveToArchive}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ddd4c4] bg-white hover:bg-amber-50 hover:border-[#b37b24] text-xs font-semibold text-slate-800 dark:border-[#4A3D2C] dark:bg-[#241C14] dark:hover:bg-[#2F251A] dark:hover:border-[#D4A017]/60 dark:text-[#F5F0E6] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-[#9a6b24] dark:text-[#D4A017]" />
            <span className="hidden sm:inline">Simpan Arsip</span>
            <span className="sm:hidden">Simpan</span>
          </button>

          <button
            type="button"
            onClick={onExportWord}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ddd4c4] bg-white hover:bg-amber-50 hover:border-[#b37b24] text-xs font-semibold text-slate-800 dark:border-[#4A3D2C] dark:bg-[#241C14] dark:hover:bg-[#2F251A] dark:hover:border-[#D4A017]/60 dark:text-[#F5F0E6] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5 text-[#9a6b24] dark:text-[#D4A017]" />
            <span className="hidden sm:inline">Unduh .DOCX</span>
            <span className="sm:hidden">.DOCX</span>
          </button>

          <button
            type="button"
            onClick={onPrint}
            title="Dialog cetak browser (gunakan Cetak PDF jika diblokir pratinjau)"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ddd4c4] bg-white hover:bg-amber-50 hover:border-[#b37b24] text-xs font-semibold text-slate-800 dark:border-[#4A3D2C] dark:bg-[#241C14] dark:hover:bg-[#2F251A] dark:hover:border-[#D4A017]/60 dark:text-[#F5F0E6] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#9a6b24] dark:text-[#D4A017]" />
            <span className="hidden sm:inline">Print</span>
          </button>

          <button
            type="button"
            onClick={onExportPdf}
            disabled={isExportingPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#D4A017] hover:bg-[#E5B022] disabled:opacity-60 disabled:cursor-wait text-xs font-bold text-[#14100C] transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
          >
            {isExportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileDown className="w-3.5 h-3.5" />
            )}
            <span>{isExportingPdf ? 'Membuat PDF...' : 'Cetak PDF'}</span>
          </button>

          <ThemeToggleButton compact />
        </div>
      </div>

      {/* Subtle Completion Progress Bar */}
      <div className="h-[2px] w-full bg-[#e3dbcc] dark:bg-[#2E251B]">
        <div
          className="h-full bg-[#D4A017] transition-all duration-300"
          style={{ width: `${Math.max(12, Math.min(100, completionPercent))}%` }}
        />
      </div>
    </header>
  );
};
