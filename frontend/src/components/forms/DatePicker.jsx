import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatDate, parseDate } from './DateRangePicker';

const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const monthNames = [
  'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre',
];

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const isSameDay = (a, b) => !!a && !!b && formatDate(a) === formatDate(b);
const isBefore = (a, b) => startOfDay(a).getTime() < startOfDay(b).getTime();
const isAfter = (a, b) => startOfDay(a).getTime() > startOfDay(b).getTime();

const getMonthLabel = (date) => `${monthNames[date.getMonth()]} ${date.getFullYear()}`;

const getDaysInMonth = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();
  const mondayIndex = (firstDay.getDay() + 6) % 7;
  const cells = Array.from({ length: mondayIndex }, () => null);

  for (let day = 1; day <= totalDays; day += 1) {
    cells.push(new Date(year, month, day));
  }

  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

export default function DatePicker({
  value,
  onChange,
  placeholder = 'dd/mm/yyyy',
  required = false,
  disabled = false,
  minDate,
  maxDate,
}) {
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ left: 0, top: 0, width: 320 });
  const selectedDate = useMemo(() => parseDate(value), [value]);
  const min = useMemo(() => parseDate(minDate), [minDate]);
  const max = useMemo(() => parseDate(maxDate), [maxDate]);
  const [viewDate, setViewDate] = useState(() => selectedDate || min || new Date());
  const days = useMemo(() => getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth()), [viewDate]);

  useEffect(() => {
    const closeOnOutside = (event) => {
      const inRoot = rootRef.current && rootRef.current.contains(event.target);
      const inPanel = panelRef.current && panelRef.current.contains(event.target);
      if (!inRoot && !inPanel) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const updatePanelPosition = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;

      const width = Math.min(320, window.innerWidth - 24);
      const left = Math.min(Math.max(rect.left, 12), window.innerWidth - width - 12);
      const belowTop = rect.bottom + 8;
      const estimatedHeight = 356;
      const top = belowTop + estimatedHeight > window.innerHeight - 12
        ? Math.max(12, rect.top - estimatedHeight - 8)
        : belowTop;

      setPanelPosition({ left, top, width });
    };

    updatePanelPosition();
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);
    return () => {
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (selectedDate) setViewDate(selectedDate);
  }, [selectedDate]);

  const isDisabledDay = (day) => {
    if (!day || disabled) return true;
    if (min && isBefore(day, min)) return true;
    if (max && isAfter(day, max)) return true;
    return false;
  };

  const selectDay = (day) => {
    if (isDisabledDay(day)) return;
    onChange?.(formatDate(day));
    setTimeout(() => setOpen(false), 120);
  };

  const goToMonth = (offset) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const setToday = () => {
    const today = startOfDay(new Date());
    if (isDisabledDay(today)) return;
    onChange?.(formatDate(today));
    setViewDate(today);
  };

  const clear = () => onChange?.('');

  return (
    <div ref={rootRef} className={`relative ${open ? 'z-50' : ''}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={`group flex min-h-[44px] w-full items-center justify-between gap-3 rounded-2xl border px-4 text-left text-sm font-bold transition ${
          disabled
            ? 'cursor-not-allowed border-white/5 bg-white/[0.03] text-slate-500 opacity-60'
            : 'border-white/10 bg-[#171620]/90 text-slate-100 hover:border-violet-400/40 hover:bg-white/[0.07] focus:border-violet-400/60'
        }`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={value ? 'text-slate-100' : 'text-slate-400'}>{value || placeholder}</span>
        <CalendarDays size={17} className="text-violet-200 transition group-hover:text-cyan-200" />
      </button>

      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          required
          value={value || ''}
          onChange={() => {}}
          className="pointer-events-none absolute h-px w-px opacity-0"
        />
      )}

      {createPortal(
        <AnimatePresence>
          {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -4, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.985 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            style={{
              left: panelPosition.left,
              top: panelPosition.top,
              width: panelPosition.width,
            }}
            className="fixed z-[9999] overflow-hidden rounded-2xl border border-white/10 bg-[#191722]/95 p-3 shadow-[0_22px_70px_rgba(0,0,0,.55)] backdrop-blur-2xl"
            role="dialog"
            aria-label="Calendrier"
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 left-6 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative z-10 mb-3 flex items-center justify-between">
              <button type="button" onClick={() => goToMonth(-1)} className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-slate-300 transition hover:bg-violet-500/20">
                <ChevronLeft size={16} />
              </button>
              <motion.strong
                key={getMonthLabel(viewDate)}
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.14 }}
                className="font-['Sora'] text-sm font-black capitalize text-white"
              >
                {getMonthLabel(viewDate)}
              </motion.strong>
              <button type="button" onClick={() => goToMonth(1)} className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-slate-300 transition hover:bg-violet-500/20">
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="relative z-10 grid grid-cols-7 gap-1 text-center">
              {weekDays.map((day) => (
                <span key={day} className="py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                  {day}
                </span>
              ))}
              {days.map((day, index) => {
                const selected = isSameDay(day, selectedDate);
                const today = isSameDay(day, new Date());
                const blocked = isDisabledDay(day);

                return (
                  <button
                    type="button"
                    key={day ? formatDate(day) : `empty-${index}`}
                    disabled={blocked}
                    onClick={() => selectDay(day)}
                    className={`relative grid h-9 place-items-center rounded-xl text-sm font-bold transition ${
                      !day ? 'invisible' : ''
                    } ${
                      blocked
                        ? 'text-slate-700'
                        : 'text-slate-300 hover:bg-violet-500/18 hover:text-white'
                    }`}
                    aria-label={day ? formatDate(day) : undefined}
                  >
                    {selected && (
                      <motion.span
                        initial={{ scale: 0.72, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute inset-1 rounded-full bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-400 shadow-[0_0_24px_rgba(168,85,247,.45)]"
                        transition={{ duration: 0.18 }}
                      />
                    )}
                    <span className="relative z-10">{day?.getDate()}</span>
                    {today && !selected && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-orange-300" />}
                  </button>
                );
              })}
            </div>

            <div className="relative z-10 mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
              <button type="button" onClick={clear} className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-slate-300 transition hover:bg-white/[0.06]">
                <X size={13} /> Effacer
              </button>
              <button type="button" onClick={setToday} className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-xs font-black text-cyan-100 transition hover:bg-cyan-400/16">
                Aujourd'hui
              </button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 px-3 py-2 text-xs font-black text-white transition hover:brightness-110">
                Valider
              </button>
            </div>
          </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
