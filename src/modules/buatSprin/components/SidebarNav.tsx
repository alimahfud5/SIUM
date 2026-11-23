import React from 'react';
import {
  Archive,
  BookTemplate,
  FilePlus2,
  FileText,
  RotateCcw,
  Stamp,
  X,
} from 'lucide-react';
import { AppView, SprinTemplateItem } from '../types/sprin';

interface SidebarNavProps {
  isOpen: boolean;
  onCloseMobile: () => void;
  activeView: AppView;
  activeEditorSection?: string;
  onSelectView: (view: AppView) => void;
  onOpenTtdMenu: () => void;
  archiveCount: number;
  activeDocId?: string;
  activeDocNumber: string;
  useLampiran: boolean;
  pageCount?: number;
  templates: SprinTemplateItem[];
  onSelectTemplate: (template: SprinTemplateItem) => void;
  onNewBlankSprin: () => void;
  onLoadReferenceTemplate: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  isOpen,
  onCloseMobile,
  activeView,
  activeEditorSection,
  onSelectView,
  onOpenTtdMenu,
  archiveCount,
  activeDocId,
  activeDocNumber,
  useLampiran,
  pageCount,
  templates,
  onSelectTemplate,
  onNewBlankSprin,
  onLoadReferenceTemplate,
}) => {
  const navItems: { id: AppView; label: string; count?: number; icon: React.ReactNode }[] = [
    {
      id: 'editor',
      label: 'Editor & Pratinjau',
      icon: <FileText className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'arsip',
      label: 'Arsip Surat Perintah',
      count: archiveCount,
      icon: <Archive className="w-4 h-4 shrink-0" />,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="no-print fixed inset-0 z-40 bg-black/50 dark:bg-black/60 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`no-print fixed lg:static inset-y-0 left-0 z-50 w-[256px] shrink-0 bg-white border-r border-[#e3dbcc] dark:bg-[#19140E] dark:border-[#3A3024] flex flex-col transition-transform duration-200 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:hidden'
        }`}
      >
        {/* Mobile Drawer Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#e3dbcc] dark:border-[#3A3024] lg:hidden">
          <span className="font-display text-sm tracking-wider text-slate-900 dark:text-[#F5F0E6] uppercase">
            Menu Administrasi
          </span>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Tutup menu"
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-[#f4f1ea] dark:text-[#B5A894] dark:hover:text-[#F5F0E6] dark:hover:bg-[#2A2218] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="p-3.5 space-y-1">
          <div className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-wider text-slate-500 dark:text-[#8C7E69] uppercase">
            Ruang Kerja
          </div>
          {navItems.map((item) => {
            const isActive =
              activeView === item.id &&
              !(item.id === 'editor' && activeEditorSection === 'ttd');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectView(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-amber-50 text-[#8f5f16] border border-amber-300 dark:bg-[#D4A017]/15 dark:text-[#F4C94D] dark:border-[#D4A017]/40'
                    : 'text-slate-600 hover:bg-[#f4f1ea] hover:text-slate-900 dark:text-[#C8BCA8] dark:hover:bg-[#241D15] dark:hover:text-[#F5F0E6] border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </span>
                {typeof item.count === 'number' && (
                  <span className="font-mono-num text-xs text-slate-500 dark:text-[#9E907A]">{item.count}</span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              onOpenTtdMenu();
              onCloseMobile();
            }}
            className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeView === 'editor' && activeEditorSection === 'ttd'
                ? 'bg-amber-50 text-[#8f5f16] border border-amber-300 dark:bg-[#D4A017]/15 dark:text-[#F4C94D] dark:border-[#D4A017]/40'
                : 'text-slate-600 hover:bg-[#f4f1ea] hover:text-slate-900 dark:text-[#C8BCA8] dark:hover:bg-[#241D15] dark:hover:text-[#F5F0E6] border border-transparent'
            }`}
          >
            <span className="flex items-center gap-2.5 truncate">
              <Stamp className="w-4 h-4 shrink-0" />
              <span className="truncate">Import TTD & Stempel</span>
            </span>
          </button>
        </div>

        <div className="mx-3.5 my-1 border-t border-[#e3dbcc] dark:border-[#32291E]" />

        {/* Quick Template Actions */}
        <div className="p-3.5 space-y-2">
          <div className="px-2.5 pb-0.5 text-[11px] font-semibold tracking-wider text-slate-500 dark:text-[#8C7E69] uppercase">
            Aksi Cepat Dokumen
          </div>
          <button
            type="button"
            onClick={() => {
              onNewBlankSprin();
              onCloseMobile();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-800 bg-[#f8f6f1] hover:bg-amber-50 border border-[#ddd4c4] dark:text-[#F5F0E6] dark:bg-[#241D15] dark:hover:bg-[#2E251A] dark:border-[#3E3325] transition-colors whitespace-nowrap cursor-pointer"
          >
            <FilePlus2 className="w-4 h-4 text-[#9a6b24] dark:text-[#D4A017] shrink-0" />
            <span>Buat Sprin Baru</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onLoadReferenceTemplate();
              onCloseMobile();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 bg-transparent hover:bg-[#f4f1ea] border border-[#e3dbcc] dark:text-[#C8BCA8] dark:hover:text-[#F5F0E6] dark:hover:bg-[#241D15] dark:border-[#32291E] transition-colors whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-slate-500 dark:text-[#A89C89] shrink-0" />
            <span>Reset Template Default</span>
          </button>
        </div>

        <div className="mx-3.5 my-1 border-t border-[#e3dbcc] dark:border-[#32291E]" />

        {/* Koleksi Template Siap Pakai */}
        <div className="p-3.5 space-y-1.5 overflow-y-auto">
          <div className="px-2.5 pb-0.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-slate-500 dark:text-[#8C7E69] uppercase">
            <BookTemplate className="w-3.5 h-3.5 text-[#9a6b24] dark:text-[#D4A017]" />
            <span>Koleksi Template</span>
          </div>
          {templates.map((tpl) => {
            const isSelected = activeDocId === tpl.document.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => {
                  onSelectTemplate(tpl);
                  onCloseMobile();
                }}
                className={`w-full text-left px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-amber-50 border-amber-300 text-[#8f5f16] dark:bg-[#D4A017]/15 dark:border-[#D4A017]/50 dark:text-[#F4C94D]'
                    : 'bg-[#f8f6f1] hover:bg-amber-50/70 border-[#e3dbcc] text-slate-800 dark:bg-[#211A13] dark:hover:bg-[#2B2219] dark:border-[#32291E] dark:text-[#E8DFCE]'
                }`}
              >
                <div className="text-xs font-bold tracking-wide truncate">{tpl.name}</div>
                <div className="text-[10px] text-slate-500 dark:text-[#9E907A] truncate mt-0.5">{tpl.subtitle}</div>
              </button>
            );
          })}
        </div>

          {/* Active Document Summary Footer */}
          <div className="mt-auto p-4 border-t border-[#e3dbcc] bg-[#f8f6f1] dark:border-[#32291E] dark:bg-[#15100B]">
            <div className="text-[11px] text-slate-500 dark:text-[#8C7E69]">Dokumen Aktif</div>
            <div className="font-mono-num text-xs text-[#9a6b24] dark:text-[#F4C94D] mt-0.5 truncate font-semibold">
              {activeDocNumber || 'Belum bernomor'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-[#9E907A] mt-1">
              {useLampiran
                ? `${pageCount || 2} Halaman A4 · Hal 1 & Lampiran`
                : `${pageCount || 1} Halaman A4 · Tanpa Lampiran`}
            </div>
          </div>
      </aside>
    </>
  );
};
