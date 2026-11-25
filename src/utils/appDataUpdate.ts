import { DEFAULT_ORG_HEADER, DEFAULT_PAWAS_ANCHOR } from '../data/polriOktober2026';
import {
  PawasAnchor,
  Personnel,
  RosterBackupModules,
  RosterBackupPayload,
  RosterOrgHeader,
  ScheduleRevision,
  ShiftOverrides,
  UnitKey,
} from '../types/polriRoster';
import { DEFAULT_UNIT_ORDER } from './continuousRoster';
import {
  PROTECTED_AUTH_STORAGE_KEYS,
  restoreProtectedAuthStorageIfModified,
  snapshotProtectedAuthStorage,
} from './dashboardAuth';

export const CURRENT_APP_DATA_VERSION = '2026.11.24-1';
export const APPLIED_DATA_VERSION_KEY = 'kuat_pers_applied_data_version_v1';
const DISMISSED_DATA_VERSION_KEY = 'kuat_pers_dismissed_data_version_v1';

export const OPERATIONAL_STORAGE_KEYS = {
  ROSTER: 'kuat_pers_berkelanjutan_v5',
  RENGIAT: 'kuat_pers_rengiat_v1',
  PAM: 'kuat_pers_daftar_pam_v1',
  SPRIN_ACTIVE: 'siprin_active_doc_v3',
  SPRIN_ARCHIVE: 'siprin_archive_docs_v3',
  DAILY_WA_PHONE: 'kuat_pers_daily_wa_phone_v1',
} as const;

const FORBIDDEN_AUTH_FIELDS = new Set<string>([
  'accounts',
  'users',
  'admins',
  'admin',
  'user',
  'passwords',
  'password',
  'passwordHash',
  'auth',
  'session',
  'sessions',
  'credentials',
  ...PROTECTED_AUTH_STORAGE_KEYS,
]);

function readJsonFromLocalStorage(key: string): unknown | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function writeJsonToLocalStorage(key: string, value: unknown): void {
  if ((PROTECTED_AUTH_STORAGE_KEYS as readonly string[]).includes(key)) {
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Abaikan kuota penuh
  }
}

export function readExtendedOperationalModules(): RosterBackupModules {
  let dailyWaPhone: string | null | undefined = undefined;
  try {
    const phone = localStorage.getItem(OPERATIONAL_STORAGE_KEYS.DAILY_WA_PHONE);
    if (phone !== null) {
      dailyWaPhone = phone;
    }
  } catch {
    // Abaikan error storage
  }

  return {
    rengiat: readJsonFromLocalStorage(OPERATIONAL_STORAGE_KEYS.RENGIAT),
    pam: readJsonFromLocalStorage(OPERATIONAL_STORAGE_KEYS.PAM),
    buatSprinActive: readJsonFromLocalStorage(OPERATIONAL_STORAGE_KEYS.SPRIN_ACTIVE),
    buatSprinArchive: readJsonFromLocalStorage(OPERATIONAL_STORAGE_KEYS.SPRIN_ARCHIVE),
    dailyWaPhone,
  };
}

export function applyExtendedOperationalModules(
  modules?: RosterBackupModules
): void {
  if (!modules || typeof modules !== 'object') return;

  const authSnapshot = snapshotProtectedAuthStorage();
  try {
    if (modules.rengiat && typeof modules.rengiat === 'object') {
      writeJsonToLocalStorage(OPERATIONAL_STORAGE_KEYS.RENGIAT, modules.rengiat);
    }
    if (modules.pam && typeof modules.pam === 'object') {
      writeJsonToLocalStorage(OPERATIONAL_STORAGE_KEYS.PAM, modules.pam);
    }
    if (modules.buatSprinActive && typeof modules.buatSprinActive === 'object') {
      writeJsonToLocalStorage(
        OPERATIONAL_STORAGE_KEYS.SPRIN_ACTIVE,
        modules.buatSprinActive
      );
    }
    if (Array.isArray(modules.buatSprinArchive)) {
      writeJsonToLocalStorage(
        OPERATIONAL_STORAGE_KEYS.SPRIN_ARCHIVE,
        modules.buatSprinArchive
      );
    }
    if (typeof modules.dailyWaPhone === 'string') {
      try {
        localStorage.setItem(
          OPERATIONAL_STORAGE_KEYS.DAILY_WA_PHONE,
          modules.dailyWaPhone
        );
      } catch {
        // Abaikan kuota penuh
      }
    }
  } finally {
    restoreProtectedAuthStorageIfModified(authSnapshot);
  }
}

export function resetExtendedOperationalModulesToDefaults(): void {
  const authSnapshot = snapshotProtectedAuthStorage();
  try {
    localStorage.removeItem(OPERATIONAL_STORAGE_KEYS.RENGIAT);
    localStorage.removeItem(OPERATIONAL_STORAGE_KEYS.PAM);
    localStorage.removeItem(OPERATIONAL_STORAGE_KEYS.SPRIN_ACTIVE);
    localStorage.removeItem(OPERATIONAL_STORAGE_KEYS.SPRIN_ARCHIVE);
    localStorage.removeItem(OPERATIONAL_STORAGE_KEYS.DAILY_WA_PHONE);
  } catch {
    // Abaikan error storage
  } finally {
    restoreProtectedAuthStorageIfModified(authSnapshot);
  }
}

export interface ParsedDataUpdatePreview {
  exportedAt?: string;
  dataVersion?: string;
  strippedAuthFieldCount: number;
  data: RosterBackupPayload['data'];
}

function countAndStripAuthFields(obj: Record<string, unknown>): number {
  let count = 0;
  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_AUTH_FIELDS.has(key)) {
      delete obj[key];
      count += 1;
    }
  }
  return count;
}

export function parseDataUpdateInput(rawText: string): ParsedDataUpdatePreview {
  const parsedRaw = JSON.parse(rawText) as Record<string, unknown>;
  if (!parsedRaw || typeof parsedRaw !== 'object') {
    throw new Error('Format JSON tidak valid.');
  }

  const parsed: Record<string, unknown> = { ...parsedRaw };
  let strippedAuthFieldCount = countAndStripAuthFields(parsed);

  const rawCandidate =
    parsed.data && typeof parsed.data === 'object'
      ? ({ ...(parsed.data as Record<string, unknown>) } as Record<string, unknown>)
      : parsed;

  if (rawCandidate !== parsed) {
    strippedAuthFieldCount += countAndStripAuthFields(rawCandidate);
  }

  if (!Array.isArray(rawCandidate.personnel) || rawCandidate.personnel.length === 0) {
    throw new Error(
      'Data personel tidak ditemukan atau kosong di file update/backup.'
    );
  }

  const validPersonnel = rawCandidate.personnel.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof (item as Personnel).id === 'string' &&
      typeof (item as Personnel).name === 'string' &&
      typeof (item as Personnel).unit === 'string'
  );

  if (!validPersonnel) {
    throw new Error('Struktur data personel di dalam file tidak valid.');
  }

  const headerObj =
    rawCandidate.header && typeof rawCandidate.header === 'object'
      ? {
          ...DEFAULT_ORG_HEADER,
          ...(rawCandidate.header as Partial<RosterOrgHeader>),
        }
      : DEFAULT_ORG_HEADER;

  const pawasObj =
    rawCandidate.pawasAnchor &&
    typeof rawCandidate.pawasAnchor === 'object' &&
    typeof (rawCandidate.pawasAnchor as PawasAnchor).dateKey === 'string'
      ? (rawCandidate.pawasAnchor as PawasAnchor)
      : DEFAULT_PAWAS_ANCHOR;

  const unitOrderArr = Array.isArray(rawCandidate.unitOrder)
    ? (rawCandidate.unitOrder as UnitKey[])
    : DEFAULT_UNIT_ORDER;

  const overridesObj =
    rawCandidate.overrides && typeof rawCandidate.overrides === 'object'
      ? (rawCandidate.overrides as ShiftOverrides)
      : {};

  const revisionsArr = Array.isArray(rawCandidate.scheduleRevisions)
    ? (rawCandidate.scheduleRevisions as ScheduleRevision[])
    : undefined;

  let modulesObj: RosterBackupModules | undefined = undefined;
  if (rawCandidate.modules && typeof rawCandidate.modules === 'object') {
    const rawMods = { ...(rawCandidate.modules as Record<string, unknown>) };
    strippedAuthFieldCount += countAndStripAuthFields(rawMods);
    modulesObj = {
      rengiat: rawMods.rengiat,
      pam: rawMods.pam,
      buatSprinActive: rawMods.buatSprinActive,
      buatSprinArchive: rawMods.buatSprinArchive,
      dailyWaPhone:
        typeof rawMods.dailyWaPhone === 'string' || rawMods.dailyWaPhone === null
          ? rawMods.dailyWaPhone
          : undefined,
    };
  }

  return {
    exportedAt:
      typeof parsed.exportedAt === 'string' ? parsed.exportedAt : undefined,
    dataVersion:
      typeof parsed.dataVersion === 'string' ? parsed.dataVersion : undefined,
    strippedAuthFieldCount,
    data: {
      header: headerObj,
      personnel: rawCandidate.personnel as Personnel[],
      unitOrder: unitOrderArr,
      pawasAnchor: pawasObj,
      overrides: overridesObj,
      scheduleRevisions: revisionsArr,
      modules: modulesObj,
    },
  };
}

export function buildOperationalUpdatePayload(params: {
  header: RosterOrgHeader;
  personnel: Personnel[];
  unitOrder: UnitKey[];
  pawasAnchor: PawasAnchor;
  overrides: ShiftOverrides;
  scheduleRevisions?: ScheduleRevision[];
}): RosterBackupPayload {
  return {
    app: 'kuat-pers-jadwal-piket',
    version: 2,
    dataVersion: CURRENT_APP_DATA_VERSION,
    excludesAuthAccounts: true,
    exportedAt: new Date().toISOString(),
    data: {
      header: params.header,
      personnel: params.personnel,
      unitOrder: params.unitOrder,
      pawasAnchor: params.pawasAnchor,
      overrides: params.overrides,
      scheduleRevisions: params.scheduleRevisions,
      modules: readExtendedOperationalModules(),
    },
  };
}

export function detectPendingAppDataUpdate(): boolean {
  try {
    const hasExistingInstall =
      localStorage.getItem(OPERATIONAL_STORAGE_KEYS.ROSTER) !== null ||
      localStorage.getItem('piket_offline_accounts_v2') !== null ||
      localStorage.getItem('piket_dashboard_auth_v1') !== null;

    if (!hasExistingInstall) {
      localStorage.setItem(APPLIED_DATA_VERSION_KEY, CURRENT_APP_DATA_VERSION);
      return false;
    }

    const applied = localStorage.getItem(APPLIED_DATA_VERSION_KEY);
    if (applied === CURRENT_APP_DATA_VERSION) {
      return false;
    }

    const dismissed = localStorage.getItem(DISMISSED_DATA_VERSION_KEY);
    if (dismissed === CURRENT_APP_DATA_VERSION) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function markCurrentDataVersionApplied(): void {
  try {
    localStorage.setItem(APPLIED_DATA_VERSION_KEY, CURRENT_APP_DATA_VERSION);
    localStorage.removeItem(DISMISSED_DATA_VERSION_KEY);
  } catch {
    // Abaikan error storage
  }
}

export function dismissPendingAppDataUpdate(): void {
  try {
    localStorage.setItem(DISMISSED_DATA_VERSION_KEY, CURRENT_APP_DATA_VERSION);
  } catch {
    // Abaikan error storage
  }
}
