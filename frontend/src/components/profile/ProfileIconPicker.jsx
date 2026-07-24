import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import ProfileAvatar, { PROFILE_COLORS, PROFILE_ICONS } from './ProfileAvatar';
import { Button } from '../ui';

const iconLabels = {
  user: 'Utilisateur',
  'graduation-cap': 'Formation',
  'book-open': 'Livre',
  calendar: 'Calendrier',
  'clipboard-list': 'Liste',
  shield: 'Securite',
  settings: 'Parametres',
  users: 'Equipe',
  'user-check': 'Validation',
  qrcode: 'QR Code',
  briefcase: 'Professionnel',
  star: 'Excellence',
  target: 'Objectif',
  'file-text': 'Document',
  layers: 'Plans',
  presentation: 'Presentation',
};

const colorLabels = {
  purple: 'Violet',
  cyan: 'Cyan',
  orange: 'Orange',
  green: 'Vert',
  blue: 'Bleu',
  pink: 'Rose',
};

export default function ProfileIconPicker({ user, onSave, saving = false }) {
  const [icon, setIcon] = useState(user?.profile_icon || 'user');
  const [color, setColor] = useState(user?.profile_color || 'cyan');

  useEffect(() => {
    setIcon(user?.profile_icon || 'user');
    setColor(user?.profile_color || 'cyan');
  }, [user?.profile_icon, user?.profile_color]);

  const previewUser = useMemo(() => ({ ...user, profile_icon: icon, profile_color: color }), [user, icon, color]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.035] p-4">
        <ProfileAvatar user={previewUser} size="lg" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.22em] text-[var(--t3)]">Apercu</p>
          <h3 className="mt-1 font-['Sora'] text-lg font-black text-[var(--t1)]">{user?.nom_complet || `${user?.prenom || ''} ${user?.nom || ''}`.trim()}</h3>
          <p className="text-xs text-[var(--t3)]">Selectionnez une icone et une couleur de profil.</p>
        </div>
      </div>

      <div>
        <p className="mb-3 text-[10px] font-black uppercase tracking-[.2em] text-[var(--t3)]">Choisir une icone</p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {Object.entries(PROFILE_ICONS).map(([key, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setIcon(key)}
              className={clsx(
                'grid h-11 place-items-center rounded-2xl border transition duration-150 hover:-translate-y-0.5',
                icon === key
                  ? 'border-cyan-300/60 bg-cyan-400/15 text-cyan-100 shadow-[0_0_26px_rgba(34,211,238,.16)]'
                  : 'border-white/10 bg-white/[.035] text-[var(--t3)] hover:border-white/20 hover:text-[var(--t1)]'
              )}
              title={iconLabels[key]}
            >
              <Icon size={17} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-[10px] font-black uppercase tracking-[.2em] text-[var(--t3)]">Choisir une couleur</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Object.entries(PROFILE_COLORS).map(([key, classes]) => (
            <button
              key={key}
              type="button"
              onClick={() => setColor(key)}
              className={clsx(
                'flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold transition duration-150',
                classes,
                color === key ? 'scale-[1.02] ring-1 ring-white/30' : 'opacity-75 hover:opacity-100'
              )}
            >
              <span className="h-3 w-3 rounded-full bg-current" />
              {colorLabels[key]}
            </button>
          ))}
        </div>
      </div>

      <Button
        type="button"
        onClick={() => onSave?.({ profile_icon: icon, profile_color: color })}
        disabled={saving}
        className="w-full justify-center"
      >
        {saving ? 'Enregistrement...' : 'Enregistrer l’icone'}
      </Button>
    </div>
  );
}
