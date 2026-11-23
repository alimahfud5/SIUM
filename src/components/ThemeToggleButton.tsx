import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useThemeMode } from '../utils/themeMode';

interface ThemeToggleButtonProps {
  className?: string;
  compact?: boolean;
}

export const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({
  className = '',
  compact = false,
}) => {
  const { isDark, toggleTheme } = useThemeMode();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={!isDark}
      aria-label={isDark ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
      title={isDark ? 'Pindah ke Mode Terang' : 'Pindah ke Mode Gelap'}
      className={`inline-flex items-center gap-1.5 rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer print:hidden bg-white border-[#ddd4c4] text-slate-700 hover:border-[#b37b24] hover:text-[#8f5f16] dark:bg-[#201a13] dark:border-[#382e22] dark:text-[#d6cec2] dark:hover:border-[#8d6b38] dark:hover:text-[#f0cf89] ${
        compact ? 'px-2.5 py-1.5 text-xs font-semibold' : 'px-2.5 py-2 text-xs font-medium'
      } ${className}`}
    >
      {isDark ? (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="hidden md:inline">Mode Terang</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-[#8f5f16] shrink-0" />
          <span className="hidden md:inline">Mode Gelap</span>
        </>
      )}
    </button>
  );
};
