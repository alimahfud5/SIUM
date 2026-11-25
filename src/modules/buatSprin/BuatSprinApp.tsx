import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  BookTemplate,
  CheckCircle2,
  ChevronDown,
  Eye,
  FileDown,
  FilePlus2,
  FileText,
  Loader2,
  RotateCcw,
  Stamp,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { ArchiveView } from './components/ArchiveView';
import { DashboardHeader } from './components/DashboardHeader';
import {
  computePageOneCatchword,
  LetterPageOne,
  useSprinPageOneSlices,
} from './components/LetterPageOne';
import {
  computeLampiranCatchword,
  LetterPageTwo,
  useLampiranPages,
} from './components/LetterPageTwo';
import { EditorSectionId, SprinEditorForm } from './components/SprinEditorForm';
import {
  DEFAULT_LAMPIRAN_COL_WIDTHS,
  DEFAULT_SPRIN_DOCUMENT,
  DEFAULT_STAMP_CONFIG,
  DEFAULT_STAMP_IMAGE_URL,
  getNormalizedLampiranColWidths,
  INITIAL_ARCHIVE_DOCUMENTS,
  SPRIN_TEMPLATE_COLLECTION,
} from './data/defaultData';
import {
  AppView,
  LetterPreviewPage,
  SprinDocument,
  SprinTemplateItem,
} from './types/sprin';
import { resolvePublicAsset } from '../../utils/publicAsset';
import {
  PawasAnchor,
  Personnel,
  ScheduleRevision,
  ShiftOverrides,
  UnitKey,
} from '../../types/polriRoster';
import { exportSprinToWord } from './utils/exportDoc';
import { exportSprinToPdf } from './utils/exportPdf';

const STORAGE_KEYS = {
  ACTIVE_DOC: 'siprin_active_doc_v3',
  ARCHIVE: 'siprin_archive_docs_v3',
};

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeDoc(doc: SprinDocument): SprinDocument {
  const rawHeaderTitle = (doc.lampiranHeaderTitle || '').trim();
  const normalizedHeaderTitle =
    !rawHeaderTitle ||
    rawHeaderTitle === 'LAMPIRAN SPRIN KAPOLSEK SMG SLTN' ||
    rawHeaderTitle === 'LAMPIRAN  SPRIN  KAPOLSEK  SMG SLTN' ||
    rawHeaderTitle === 'SPRIN KAPOLSEK SMG SELATAN'
      ? 'LAMP SPRIN KAPOLSEK SMG SELATAN'
      : doc.lampiranHeaderTitle;

  const rawKepadaText = (doc.kepadaText || '').trim();
  const normalizedKepadaText = !rawKepadaText
    ? DEFAULT_SPRIN_DOCUMENT.kepadaText
    : doc.kepadaText;

  const personelCount = Array.isArray(doc.personelList) ? doc.personelList.length : 0;

  return {
    ...DEFAULT_SPRIN_DOCUMENT,
    ...doc,
    useLampiran: (doc.useLampiran ?? false) || personelCount > 5,
    kepadaText: normalizedKepadaText,
    lampiranHeaderTitle: normalizedHeaderTitle,
    lampiranColWidths: getNormalizedLampiranColWidths(doc.lampiranColWidths),
    stampConfig: {
      ...DEFAULT_STAMP_CONFIG,
      ...(doc.stampConfig || {}),
      stampImageDataUrl: resolvePublicAsset(
        doc.stampConfig?.stampImageDataUrl || DEFAULT_STAMP_IMAGE_URL
      ),
    },
  };
}

export interface BuatSprinAppProps {
  mainPersonnel: Personnel[];
  unitOrder: UnitKey[];
  pawasAnchor: PawasAnchor;
  overrides: ShiftOverrides;
  scheduleRevisions?: ScheduleRevision[];
  todayDateKey: string;
  onExitToDashboard?: () => void;
}

export function BuatSprinApp({
  mainPersonnel,
  unitOrder,
  pawasAnchor,
  overrides,
  scheduleRevisions,
  todayDateKey,
  onExitToDashboard,
}: BuatSprinAppProps) {
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<AppView>('editor');
  const [activeSection, setActiveSection] = useState<EditorSectionId>('hal1');
  const [previewPage, setPreviewPage] = useState<LetterPreviewPage>('both');
  const [zoom, setZoom] = useState<number>(0.72);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [piketDateKey, setPiketDateKey] = useState<string>(todayDateKey);
  const printContainerRef = useRef<HTMLDivElement>(null);
  const templateMenuRef = useRef<HTMLDivElement>(null);

  const [activeDoc, setActiveDoc] = useState<SprinDocument>(() =>
    normalizeDoc(readStorage<SprinDocument>(STORAGE_KEYS.ACTIVE_DOC, DEFAULT_SPRIN_DOCUMENT))
  );
  const [archiveDocs, setArchiveDocs] = useState<SprinDocument[]>(() =>
    readStorage<SprinDocument[]>(STORAGE_KEYS.ARCHIVE, INITIAL_ARCHIVE_DOCUMENTS).map(normalizeDoc)
  );

  // Close template menu on outside click or Escape
  useEffect(() => {
    if (!templateMenuOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (templateMenuRef.current && !templateMenuRef.current.contains(e.target as Node)) {
        setTemplateMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTemplateMenuOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [templateMenuOpen]);

  // Sync state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_DOC, JSON.stringify(activeDoc));
    } catch {
      // ignore storage quota error
    }
  }, [activeDoc]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ARCHIVE, JSON.stringify(archiveDocs));
    } catch {
      // ignore
    }
  }, [archiveDocs]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // Compute completion percentage for gold header bar
  const completionPercent = useMemo(() => {
    const checks = [
      Boolean(activeDoc.kopLine1.trim()),
      Boolean(activeDoc.kopLine2.trim()),
      Boolean(activeDoc.nomorSprin.trim()),
      Boolean(activeDoc.pertimbangan.trim()),
      activeDoc.dasarList.length > 0,
      activeDoc.untukList.length > 0,
      activeDoc.personelList.length > 0,
      Boolean(activeDoc.pejabatNama.trim()),
    ];
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [activeDoc]);

  const { chunks: lampiranPages, lampiranMeasurerNode } = useLampiranPages(activeDoc);

  const { slices: pageOneSlices, measurerNode } = useSprinPageOneSlices(activeDoc);
  const autoFirstPageCatchword =
    pageOneSlices.length > 1
      ? computePageOneCatchword(activeDoc, pageOneSlices[1])
      : undefined;
  const firstPageCatchword =
    (activeDoc.kataSambung || '').trim() || autoFirstPageCatchword || '';
  const totalPageCount = activeDoc.useLampiran
    ? pageOneSlices.length + lampiranPages.length
    : pageOneSlices.length;

  const handleSaveToArchive = () => {
    const stampedDoc: SprinDocument = {
      ...activeDoc,
      updatedAt: new Date().toISOString(),
    };
    setArchiveDocs((prev) => {
      const idx = prev.findIndex((d) => d.id === stampedDoc.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = stampedDoc;
        return next;
      }
      return [stampedDoc, ...prev];
    });
    showToast(`Surat ${stampedDoc.nomorSprin} disimpan ke arsip`);
  };

  const handleCreateNewSprin = () => {
    const nextNum = 214 + archiveDocs.length;
    const blankDoc: SprinDocument = {
      ...DEFAULT_SPRIN_DOCUMENT,
      id: `sprin-${Date.now()}`,
      status: 'Draft',
      useLampiran: false,
      updatedAt: new Date().toISOString(),
      nomorSprin: `Sprin/${nextNum}/XI/HUK.6.6./2026`,
      pertimbangan:
        'guna tertib administrasi khususnya dalam rangka pelaksanaan tugas di lingkungan Polsek Semarang Selatan, maka perlu diterbitkan surat perintah;',
      untukList: [
        'melaksanakan tugas sesuai ploting dan arahan pimpinan;',
        'melaksanakan perintah ini dengan seksama dan penuh rasa tanggung jawab;',
        'melaporkan hasil pelaksanaan kegiatan kepada Kapolsek Semarang Selatan;',
      ],
      lampiranNomor: `SPRIN/${nextNum}/XI/HUK.6.6./2026`,
      personelList: [],
    };
    setActiveDoc(blankDoc);
    setActiveView('editor');
    setActiveSection('hal1');
    setTemplateMenuOpen(false);
    showToast(`Draft Surat Perintah baru (${nextNum}) siap diisi`);
  };

  const handleLoadReferenceTemplate = () => {
    setActiveDoc({
      ...DEFAULT_SPRIN_DOCUMENT,
      updatedAt: new Date().toISOString(),
    });
    setActiveView('editor');
    setActiveSection('hal1');
    setTemplateMenuOpen(false);
    showToast('Template default Sprin/213/X/HUK.6.6./2026 (2 Halaman) dimuat ulang');
  };

  const handleApplyTemplate = (template: SprinTemplateItem) => {
    setActiveDoc({
      ...template.document,
      personelList: template.document.personelList.map((p) => ({ ...p })),
      dasarList: [...template.document.dasarList],
      untukList: [...template.document.untukList],
      tembusanList: [...template.document.tembusanList],
      lampiranColWidths: getNormalizedLampiranColWidths(
        template.document.lampiranColWidths || DEFAULT_LAMPIRAN_COL_WIDTHS
      ),
      stampConfig: {
        ...DEFAULT_STAMP_CONFIG,
        ...template.document.stampConfig,
      },
      updatedAt: new Date().toISOString(),
    });
    setActiveView('editor');
    setActiveSection('hal1');
    setTemplateMenuOpen(false);
    showToast(`Template "${template.name}" dimuat ke editor`);
  };

  const handleOpenFromArchive = (doc: SprinDocument) => {
    setActiveDoc({ ...doc });
    setActiveView('editor');
    showToast(`Membuka ${doc.nomorSprin}`);
  };

  const handleDuplicateArchive = (doc: SprinDocument) => {
    const copy: SprinDocument = {
      ...doc,
      id: `sprin-${Date.now()}`,
      status: 'Draft',
      nomorSprin: `${doc.nomorSprin} (Salinan)`,
      updatedAt: new Date().toISOString(),
    };
    setArchiveDocs((prev) => [copy, ...prev]);
    showToast('Surat berhasil diduplikasi ke arsip');
  };

  const handleDeleteArchive = (id: string) => {
    setArchiveDocs((prev) => prev.filter((d) => d.id !== id));
    showToast('Surat dihapus dari arsip');
  };

  const handleFocusFromLetter = (section: EditorSectionId) => {
    setActiveSection(section);
  };

  const handleExportPdf = async () => {
    if (!printContainerRef.current || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const pageCount = await exportSprinToPdf(printContainerRef.current, activeDoc.nomorSprin);
      showToast(`File .PDF (A4 · ${pageCount} Halaman) berhasil diunduh`);
    } catch {
      showToast('Gagal membuat file .PDF. Silakan coba lagi.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    const cleanup = () => {
      document.body.classList.remove('buat-sprin-printing');
    };
    document.body.classList.add('buat-sprin-printing');
    window.addEventListener('afterprint', cleanup, { once: true });
    window.setTimeout(cleanup, 4000);
    window.print();
    if (window.self !== window.top) {
      showToast('Jika dialog cetak diblokir di mode pratinjau, gunakan tombol "Cetak PDF" untuk mengunduh PDF siap cetak.');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f4f1ea] text-slate-900 dark:bg-[#14100C] dark:text-[#F5F0E6] overflow-hidden print:bg-white print:text-black">
      {/* SCREEN WORKSPACE (Hidden during print) */}
      <div className="no-print flex flex-col flex-1 min-h-0">
        <DashboardHeader
          onBackToDashboard={onExitToDashboard}
          onSaveToArchive={handleSaveToArchive}
          onExportWord={async () => {
            try {
              await exportSprinToWord(activeDoc, firstPageCatchword);
              showToast('File .DOCX (A4 · Arial 12pt · Margin 2,5 / 1,5 / 2 / 1,5 cm) diunduh');
            } catch {
              showToast('Gagal membuat file .DOCX');
            }
          }}
          onExportPdf={handleExportPdf}
          isExportingPdf={isExportingPdf}
          onPrint={handlePrint}
          completionPercent={completionPercent}
          activeDocNumber={activeDoc.nomorSprin}
          pageCount={totalPageCount}
          useLampiran={activeDoc.useLampiran}
        />

        {/* Integrated Workspace Tool Bar (replaces nested sidebar dashboard) */}
        <div className="bg-white border-b border-[#e3dbcc] dark:bg-[#18130E] dark:border-[#32291E] px-3 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-2 z-20">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setActiveView('editor');
                if (activeSection === 'ttd') setActiveSection('hal1');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeView === 'editor' && activeSection !== 'ttd'
                  ? 'bg-[#D4A017] text-[#14100C]'
                  : 'bg-[#f8f6f1] border border-[#ddd4c4] text-slate-700 hover:text-slate-900 dark:bg-[#221B14] dark:border-[#3A3024] dark:text-[#C8BCA8] dark:hover:text-[#F5F0E6]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Editor &amp; Pratinjau</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveView('editor');
                setActiveSection('ttd');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeView === 'editor' && activeSection === 'ttd'
                  ? 'bg-[#D4A017] text-[#14100C]'
                  : 'bg-[#f8f6f1] border border-[#ddd4c4] text-slate-700 hover:text-slate-900 dark:bg-[#221B14] dark:border-[#3A3024] dark:text-[#C8BCA8] dark:hover:text-[#F5F0E6]'
              }`}
            >
              <Stamp className="w-3.5 h-3.5" />
              <span>TTD &amp; Stempel</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('arsip')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeView === 'arsip'
                  ? 'bg-[#D4A017] text-[#14100C]'
                  : 'bg-[#f8f6f1] border border-[#ddd4c4] text-slate-700 hover:text-slate-900 dark:bg-[#221B14] dark:border-[#3A3024] dark:text-[#C8BCA8] dark:hover:text-[#F5F0E6]'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Arsip Surat</span>
              <span
                className={`font-mono-num text-[11px] px-1.5 py-0.2 rounded ${
                  activeView === 'arsip'
                    ? 'bg-[#14100C]/15 text-[#14100C]'
                    : 'bg-white border border-[#e3dbcc] text-slate-600 dark:bg-[#14100C] dark:border-[#32291E] dark:text-[#B5A894]'
                }`}
              >
                {archiveDocs.length}
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCreateNewSprin}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ddd4c4] bg-[#f8f6f1] hover:bg-amber-50 hover:border-[#b37b24] text-xs font-semibold text-slate-800 dark:border-[#3E3325] dark:bg-[#221B14] dark:hover:bg-[#2E251A] dark:text-[#F5F0E6] transition-colors cursor-pointer"
            >
              <FilePlus2 className="w-3.5 h-3.5 text-[#9a6b24] dark:text-[#D4A017]" />
              <span>Sprin Baru</span>
            </button>

            <div className="relative" ref={templateMenuRef}>
              <button
                type="button"
                onClick={() => setTemplateMenuOpen((o) => !o)}
                aria-expanded={templateMenuOpen}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ddd4c4] bg-[#f8f6f1] hover:bg-amber-50 hover:border-[#b37b24] text-xs font-semibold text-slate-800 dark:border-[#3E3325] dark:bg-[#221B14] dark:hover:bg-[#2E251A] dark:text-[#F5F0E6] transition-colors cursor-pointer"
              >
                <BookTemplate className="w-3.5 h-3.5 text-[#9a6b24] dark:text-[#D4A017]" />
                <span>Koleksi Template ({SPRIN_TEMPLATE_COLLECTION.length})</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    templateMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {templateMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-72 sm:w-80 rounded-xl bg-white border border-[#ddd4c4] dark:bg-[#1E1812] dark:border-[#4A3D2C] shadow-2xl p-2 space-y-1.5 z-50">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#9E907A]">
                    Pilih Template Surat Perintah
                  </div>
                  {SPRIN_TEMPLATE_COLLECTION.map((tpl) => {
                    const isSelected = activeDoc.id === tpl.document.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => handleApplyTemplate(tpl)}
                        className={`w-full text-left px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-amber-50 border-amber-300 text-[#8f5f16] dark:bg-[#D4A017]/15 dark:border-[#D4A017]/50 dark:text-[#F4C94D]'
                            : 'bg-[#f8f6f1] hover:bg-amber-50/70 border-[#e3dbcc] text-slate-800 dark:bg-[#15110C] dark:hover:bg-[#261E16] dark:border-[#32291E] dark:text-[#E8DFCE]'
                        }`}
                      >
                        <div className="text-xs font-bold tracking-wide truncate">
                          {tpl.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-[#9E907A] truncate mt-0.5">
                          {tpl.subtitle}
                        </div>
                      </button>
                    );
                  })}

                  <div className="pt-1.5 mt-1 border-t border-[#e3dbcc] dark:border-[#32291E]">
                    <button
                      type="button"
                      onClick={handleLoadReferenceTemplate}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-[#f4f1ea] dark:text-[#C8BCA8] dark:hover:text-[#F5F0E6] dark:hover:bg-[#261E16] transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-[#A89C89]" />
                      <span>Reset Template Default</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <main className="flex-1 min-w-0 bg-[#f4f1ea] dark:bg-[#14100C]">
          {activeView === 'editor' && (
            <div className="flex flex-col xl:flex-row h-full">
              {/* Left Column: Tactical Form Editor */}
              <div className="w-full xl:w-[460px] 2xl:w-[500px] shrink-0 border-b xl:border-b-0 xl:border-r border-[#e3dbcc] dark:border-[#3A3024] p-4 lg:p-5 overflow-y-auto xl:max-h-[calc(100vh-96px)]">
                <SprinEditorForm
                  doc={activeDoc}
                  onChange={setActiveDoc}
                  mainPersonnel={mainPersonnel}
                  unitOrder={unitOrder}
                  pawasAnchor={pawasAnchor}
                  overrides={overrides}
                  scheduleRevisions={scheduleRevisions}
                  todayDateKey={todayDateKey}
                  piketDateKey={piketDateKey}
                  onChangePiketDateKey={setPiketDateKey}
                  activeSection={activeSection}
                  onChangeSection={setActiveSection}
                  autoCatchword={autoFirstPageCatchword}
                />
              </div>

              {/* Right Column: Live A4 Document Preview */}
              <div className="flex-1 min-w-0 bg-[#e6e1d6] dark:bg-[#0D0A07] flex flex-col xl:max-h-[calc(100vh-96px)]">
                {/* Preview Toolbar */}
                <div className="px-4 lg:px-6 py-2.5 bg-[#f8f6f1] border-b border-[#ddd4c4] dark:bg-[#17120D] dark:border-[#32291E] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-[#9a6b24] dark:text-[#D4A017]" />
                      <span className="text-xs font-semibold text-slate-900 dark:text-[#F5F0E6]">
                        Pratinjau Dokumen A4
                      </span>
                      <span className="text-xs text-slate-500 dark:text-[#8C7E69] hidden sm:inline">
                        · Klik area surat untuk langsung mengedit
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Page Switcher (only when Lampiran mode is enabled) */}
                      {activeDoc.useLampiran ? (
                        <div className="flex items-center gap-1 p-1 rounded-lg bg-white border border-[#ddd4c4] dark:bg-[#110D09] dark:border-[#32291E]">
                          {(
                            [
                              { id: 'both', label: `Semua (${totalPageCount} Hal)` },
                              { id: 'page1', label: `Isi Sprin (${pageOneSlices.length} Hal)` },
                              { id: 'page2', label: `Lampiran (${lampiranPages.length} Hal)` },
                            ] as const
                          ).map((tab) => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setPreviewPage(tab.id)}
                              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                                previewPage === tab.id
                                  ? 'bg-[#D4A017] text-[#14100C]'
                                  : 'text-slate-600 hover:text-slate-900 dark:text-[#A89C89] dark:hover:text-[#F5F0E6]'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-white border border-[#ddd4c4] text-[#9a6b24] dark:bg-[#110D09] dark:border-[#32291E] text-xs font-semibold dark:text-[#D4A017]">
                          {pageOneSlices.length} Halaman · Tanpa Lampiran
                        </span>
                      )}

                      {/* Zoom Controls */}
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-[#ddd4c4] dark:bg-[#110D09] dark:border-[#32291E]">
                        <button
                          type="button"
                          aria-label="Perkecil pratinjau"
                          onClick={() => setZoom((z) => Math.max(0.45, +(z - 0.1).toFixed(2)))}
                          className="p-1 text-slate-600 hover:text-slate-900 dark:text-[#A89C89] dark:hover:text-[#F5F0E6] cursor-pointer"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono-num text-xs text-slate-900 dark:text-[#F5F0E6] w-11 text-center">
                          {Math.round(zoom * 100)}%
                        </span>
                        <button
                          type="button"
                          aria-label="Perbesar pratinjau"
                          onClick={() => setZoom((z) => Math.min(1.1, +(z + 0.1).toFixed(2)))}
                          className="p-1 text-slate-600 hover:text-slate-900 dark:text-[#A89C89] dark:hover:text-[#F5F0E6] cursor-pointer"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* A4 Paper Scroll Canvas */}
                  <div className="flex-1 overflow-auto p-6 lg:p-8 flex flex-col items-center gap-8">
                    {(!activeDoc.useLampiran ||
                      previewPage === 'both' ||
                      previewPage === 'page1') &&
                      pageOneSlices.map((slice, sIdx) => {
                        const sliceCatchword =
                          sIdx === 0 && (activeDoc.kataSambung || '').trim()
                            ? activeDoc.kataSambung!.trim()
                            : sIdx < pageOneSlices.length - 1
                              ? computePageOneCatchword(activeDoc, pageOneSlices[sIdx + 1])
                              : undefined;
                        return (
                          <div key={`page-one-slice-${sIdx}`} className="flex flex-col items-center">
                            <div className="w-full flex items-center justify-between text-xs text-slate-600 dark:text-[#9E907A] mb-2 px-1">
                              <span>
                                {sIdx === 0
                                  ? activeDoc.useLampiran
                                    ? 'Halaman 1 — Surat Perintah'
                                    : pageOneSlices.length === 1
                                      ? 'Surat Perintah (1 Halaman — Tanpa Lampiran)'
                                      : `Halaman 1 — Surat Perintah`
                                  : `Halaman ${sIdx + 1} — Lanjutan Surat Perintah (Header)`}
                              </span>
                              <span className="font-mono-num">
                                A4 · 210 × 297 mm · Margin 2,5 / 1,5 / 2 / 1,5 cm
                              </span>
                            </div>
                            <div
                              style={{
                                width: `calc(210mm * ${zoom})`,
                                height: `calc(297mm * ${zoom})`,
                              }}
                              className="relative shrink-0 shadow-lg"
                            >
                              <div
                                style={{
                                  transform: `scale(${zoom})`,
                                  transformOrigin: 'top left',
                                }}
                              >
                                <LetterPageOne
                                  doc={activeDoc}
                                  slice={slice}
                                  catchword={sliceCatchword}
                                  onFocusSection={handleFocusFromLetter}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}

                    {activeDoc.useLampiran &&
                      (previewPage === 'both' || previewPage === 'page2') &&
                      lampiranPages.map((chunk, pIdx) => {
                        const chunkCatchword =
                          pIdx < lampiranPages.length - 1
                            ? computeLampiranCatchword(lampiranPages[pIdx + 1])
                            : undefined;
                        return (
                          <div key={`lampiran-page-${pIdx}`} className="flex flex-col items-center">
                            <div className="w-full flex items-center justify-between text-xs text-slate-600 dark:text-[#9E907A] mb-2 px-1">
                              <span>
                                Halaman {pageOneSlices.length + pIdx + 1} — Lampiran Daftar Personel
                              </span>
                              <span className="font-mono-num">
                                {chunk.rows.length} / {activeDoc.personelList.length} Personel
                              </span>
                            </div>
                            <div
                              style={{
                                width: `calc(210mm * ${zoom})`,
                                height: `calc(297mm * ${zoom})`,
                              }}
                              className="relative shrink-0 shadow-lg"
                            >
                              <div
                                style={{
                                  transform: `scale(${zoom})`,
                                  transformOrigin: 'top left',
                                }}
                              >
                                <LetterPageTwo
                                  doc={activeDoc}
                                  pageChunk={chunk}
                                  lampiranPageNumber={pIdx + 1}
                                  catchword={chunkCatchword}
                                  onFocusSection={handleFocusFromLetter}
                                  onUpdateColWidths={(widths) =>
                                    setActiveDoc((prev) => ({
                                      ...prev,
                                      lampiranColWidths: widths,
                                      updatedAt: new Date().toISOString(),
                                    }))
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {activeView === 'arsip' && (
              <ArchiveView
                documents={archiveDocs}
                activeDocId={activeDoc.id}
                templates={SPRIN_TEMPLATE_COLLECTION}
                onSelectTemplate={handleApplyTemplate}
                onOpenInEditor={handleOpenFromArchive}
                onDuplicate={handleDuplicateArchive}
                onDelete={handleDeleteArchive}
                onCreateNew={handleCreateNewSprin}
              />
            )}
          </main>

        {/* Floating Quick Export PDF Button on Mobile */}
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={isExportingPdf}
          aria-label="Cetak PDF Surat Perintah"
          className="fixed bottom-5 right-5 sm:hidden z-40 w-12 h-12 rounded-full bg-[#D4A017] text-[#14100C] shadow-xl flex items-center justify-center cursor-pointer disabled:opacity-60"
        >
          {isExportingPdf ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
        </button>

        {/* Non-blocking Toast */}
        {toastMessage && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-white border border-amber-400 text-slate-900 dark:bg-[#251E16] dark:border-[#D4A017]/60 text-xs font-medium dark:text-[#F5F0E6] shadow-2xl">
            <CheckCircle2 className="w-4 h-4 text-[#9a6b24] dark:text-[#D4A017] shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* OFFSCREEN PAGE-BREAK MEASURERS */}
      {measurerNode}
      {lampiranMeasurerNode}

      {/* DEDICATED PRINT & PDF CONTAINER (Unscaled A4 pages for PDF capture and native print) */}
      <div
        ref={printContainerRef}
        aria-hidden="true"
        className="fixed -left-[99999px] top-0 pointer-events-none select-none print-only-container"
      >
        {pageOneSlices.map((slice, sIdx) => {
          const sliceCatchword =
            sIdx === 0 && (activeDoc.kataSambung || '').trim()
              ? activeDoc.kataSambung!.trim()
              : sIdx < pageOneSlices.length - 1
                ? computePageOneCatchword(activeDoc, pageOneSlices[sIdx + 1])
                : undefined;
          return (
            <LetterPageOne
              key={`print-page1-${sIdx}`}
              doc={activeDoc}
              slice={slice}
              catchword={sliceCatchword}
            />
          );
        })}
        {(activeDoc.useLampiran || activeDoc.personelList.length > 5) &&
          lampiranPages.map((chunk, pIdx) => {
            const chunkCatchword =
              pIdx < lampiranPages.length - 1
                ? computeLampiranCatchword(lampiranPages[pIdx + 1])
                : undefined;
            return (
              <LetterPageTwo
                key={`print-lampiran-${pIdx}`}
                doc={activeDoc}
                pageChunk={chunk}
                lampiranPageNumber={pIdx + 1}
                catchword={chunkCatchword}
              />
            );
          })}
      </div>
    </div>
  );
}

export default BuatSprinApp;
