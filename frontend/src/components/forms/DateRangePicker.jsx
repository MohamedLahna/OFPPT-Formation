import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const monthNames = [
  'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre',
];

const pad = (value) => String(value).padStart(2, '0');

export const formatDate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const parseDate = (value) => {
  if (!value) return null;
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const isSameDay = (a, b) => !!a && !!b && formatDate(a) === formatDate(b);

const isBetween = (day, start, end) => {
  if (!day || !start || !end) return false;
  const value = startOfDay(day).getTime();
  return value > startOfDay(start).getTime() && value < startOfDay(end).getTime();
};

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

const isBefore = (a, b) => startOfDay(a).getTime() < startOfDay(b).getTime();
const isAfter = (a, b) => startOfDay(a).getTime() > startOfDay(b).getTime();

export default function DateRangePicker({
  label = 'Periode',
  startDate,
  endDate,
  onChange,
  minDate,
  maxDate,
  required = false,
  disabled = false,
  className = '',
}) {
  const wrapperRef = useRef(null);
  const closeTimerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => parseDate(startDate) || parseDate(endDate) || new Date());
  const selectedStart = useMemo(() => parseDate(startDate), [startDate]);
  const selectedEnd = useMemo(() => parseDate(endDate), [endDate]);
  const min = useMemo(() => parseDate(minDate), [minDate]);
  const max = useMemo(() => parseDate(maxDate), [maxDate]);
  const days = useMemo(() => getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth()), [viewDate]);
  const hasValidRequiredValue = !required || (startDate && endDate);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const next = parseDate(startDate) || parseDate(endDate);
    if (next) setViewDate(next);
  }, [startDate, endDate]);

  const emit = (start, end) => {
    onChange?.({
      startDate: start ? formatDate(start) : '',
      endDate: end ? formatDate(end) : '',
    });
  };

  const isDisabledDay = (day) => {
    if (!day || disabled) return true;
    if (min && isBefore(day, min)) return true;
    if (max && isAfter(day, max)) return true;
    return false;
  };

  const selectDay = (day) => {
    if (isDisabledDay(day)) return;
    clearTimeout(closeTimerRef.current);

    if (!selectedStart || selectedEnd || isBefore(day, selectedStart)) {
      emit(day, null);
      return;
    }

    emit(selectedStart, day);
    closeTimerRef.current = setTimeout(() => setOpen(false), 260);
  };

  const displayValue = () => {
    if (startDate && endDate) return `${startDate} ~ ${endDate}`;
    if (startDate) return `${startDate} ~ ...`;
    return 'Selectionner une periode';
  };

  const goToMonth = (offset) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const setToday = () => {
    const today = startOfDay(new Date());
    if (isDisabledDay(today)) return;
    emit(today, today);
    setViewDate(today);
  };

  const clear = () => emit(null, null);

  return (
    <div ref={wrapperRef} className={`relative ${open ? 'z-40' : ''} ${className}`}>
      {label && (
        <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
          {label}
        </label>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={`group flex min-h-[52px] w-full items-center justify-between gap-4 rounded-3xl border px-4 text-left transition ${
          disabled
            ? 'cursor-not-allowed border-white/5 bg-white/[0.03] text-slate-500 opacity-60'
            : 'border-white/10 bg-white/[0.06] text-slate-100 shadow-[0_18px_60px_rgba(0,0,0,.18)] hover:border-violet-400/40 hover:bg-white/[0.08]'
        } ${!hasValidRequiredValue ? 'border-red-400/40' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span>
          <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Periode selectionnee</span>
          <span className="mt-1 block font-semibold">{displayValue()}</span>
        </span>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/35 to-cyan-400/20 text-cyan-100 ring-1 ring-white/10 transition group-hover:scale-105">
          <CalendarDays size={18} />
        </span>
      </button>

      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          required
          value={startDate && endDate ? 'selected' : ''}
          onChange={() => {}}
          className="pointer-events-none absolute h-px w-px opacity-0"
        />
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.985 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="relative z-50 mt-3 w-full max-w-[460px] overflow-hidden rounded-[28px] border border-white/10 bg-[#171521]/95 p-4 shadow-[0_28px_90px_rgba(0,0,0,.38)] backdrop-blur-2xl"
            role="dialog"
            aria-label={`Calendrier ${label}`}
          >
            <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-8 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative z-10 mb-4 flex items-center justify-between gap-3">
              <button type="button" onClick={() => goToMonth(-1)} className="grid h-9 w-9 place-items-center rounded-2xl border border-white/10 bg-white/[0.05] text-slate-300 transition hover:bg-violet-500/20">
                <ChevronLeft size={17} />
              </button>
              <motion.strong
                key={getMonthLabel(viewDate)}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.16 }}
                className="font-['Sora'] text-sm font-black capitalize tracking-tight text-white"
              >
                {getMonthLabel(viewDate)}
              </motion.strong>
              <button type="button" onClick={() => goToMonth(1)} className="grid h-9 w-9 place-items-center rounded-2xl border border-white/10 bg-white/[0.05] text-slate-300 transition hover:bg-violet-500/20">
                <ChevronRight size={17} />
              </button>
            </div>

            <div className="relative z-10 grid grid-cols-7 gap-1 text-center">
              {weekDays.map((day) => (
                <span key={day} className="py-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                  {day}
                </span>
              ))}
              {days.map((day, index) => {
                const sameStart = isSameDay(day, selectedStart);
                const sameEnd = isSameDay(day, selectedEnd);
                const inRange = isBetween(day, selectedStart, selectedEnd);
                const today = isSameDay(day, new Date());
                const blocked = isDisabledDay(day);

                return (
                  <button
                    type="button"
                    key={day ? formatDate(day) : `empty-${index}`}
                    disabled={blocked}
                    onClick={() => selectDay(day)}
                    className={`relative grid h-10 place-items-center rounded-2xl text-sm font-bold transition ${
                      !day ? 'invisible' : ''
                    } ${
                      blocked
                        ? 'text-slate-700'
                        : 'text-slate-300 hover:bg-violet-500/18 hover:text-white'
                    } ${inRange ? 'bg-violet-500/16 text-white' : ''}`}
                    aria-label={day ? formatDate(day) : undefined}
                  >
                    {inRange && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 rounded-2xl bg-violet-500/12"
                      />
                    )}
                    {(sameStart || sameEnd) && (
                      <motion.span
                        initial={{ scale: 0.72, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute inset-1 rounded-full bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-400 shadow-[0_0_24px_rgba(168,85,247,.45)]"
                        transition={{ duration: 0.18 }}
                      />
                    )}
                    <span className="relative z-10">{day?.getDate()}</span>
                    {today && !sameStart && !sameEnd && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-orange-300" />}
                  </button>
                );
              })}
            </div>

            <div className="relative z-10 mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
              <div className="flex gap-2">
                <button type="button" onClick={clear} className="inline-flex items-center gap-1 rounded-2xl border border-white/10 px-3 py-2 text-xs font-black text-slate-300 transition hover:bg-white/[0.06]">
                  <X size={13} /> Effacer
                </button>
                <button type="button" onClick={setToday} className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-xs font-black text-cyan-100 transition hover:bg-cyan-400/16">
                  Aujourd'hui
                </button>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 px-4 py-2 text-xs font-black text-white transition hover:brightness-110">
                Valider
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
