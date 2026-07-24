import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

export default function SelectField({
  value,
  onChange,
  options = [],
  placeholder = 'Choisir',
  required = false,
  disabled = false,
  name,
}) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => options.find((option) => String(option.value) === String(value)), [options, value]);

  useEffect(() => {
    const closeOnOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
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

  const select = (nextValue) => {
    onChange?.(nextValue);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative ${open ? 'z-40' : ''}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={`group flex min-h-[44px] w-full items-center justify-between gap-3 rounded-2xl border px-4 text-left text-sm font-bold transition ${
          disabled
            ? 'cursor-not-allowed border-white/5 bg-white/[0.03] text-slate-500 opacity-60'
            : 'border-white/10 bg-[#171620]/90 text-slate-100 hover:border-violet-400/40 hover:bg-white/[0.07] focus:border-violet-400/60'
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? 'text-slate-100' : 'text-slate-400'}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown size={17} className={`text-violet-200 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          name={name}
          required
          value={value || ''}
          onChange={() => {}}
          className="pointer-events-none absolute h-px w-px opacity-0"
        />
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.985 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute left-0 top-full mt-2 w-full max-h-64 overflow-auto rounded-2xl border border-white/10 bg-[#191722]/95 p-1.5 shadow-[0_22px_70px_rgba(0,0,0,.35)] backdrop-blur-2xl"
            role="listbox"
          >
            {options.map((option) => {
              const active = String(option.value) === String(value);
              return (
                <button
                  key={`${option.value}-${option.label}`}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => select(option.value)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${
                    active
                      ? 'bg-gradient-to-r from-violet-500/35 to-cyan-400/18 text-white'
                      : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                  }`}
                >
                  <span>{option.label}</span>
                  {active && <Check size={15} className="text-cyan-200" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
