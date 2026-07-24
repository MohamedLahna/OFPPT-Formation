import clsx from 'clsx';
import {
  BookOpen,
  Briefcase,
  Calendar,
  ClipboardList,
  FileText,
  GraduationCap,
  Layers,
  Presentation,
  QrCode,
  Settings,
  Shield,
  Star,
  Target,
  User,
  UserCheck,
  Users,
} from 'lucide-react';

export const PROFILE_ICONS = {
  user: User,
  'graduation-cap': GraduationCap,
  'book-open': BookOpen,
  calendar: Calendar,
  'clipboard-list': ClipboardList,
  shield: Shield,
  settings: Settings,
  users: Users,
  'user-check': UserCheck,
  qrcode: QrCode,
  briefcase: Briefcase,
  star: Star,
  target: Target,
  'file-text': FileText,
  layers: Layers,
  presentation: Presentation,
};

export const PROFILE_COLORS = {
  purple: 'bg-purple-500/20 text-purple-200 border-purple-400/30 shadow-[0_0_28px_rgba(168,85,247,.18)]',
  cyan: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/30 shadow-[0_0_28px_rgba(34,211,238,.16)]',
  orange: 'bg-orange-500/20 text-orange-200 border-orange-400/30 shadow-[0_0_28px_rgba(251,146,60,.16)]',
  green: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30 shadow-[0_0_28px_rgba(52,211,153,.16)]',
  blue: 'bg-blue-500/20 text-blue-200 border-blue-400/30 shadow-[0_0_28px_rgba(96,165,250,.16)]',
  pink: 'bg-pink-500/20 text-pink-200 border-pink-400/30 shadow-[0_0_28px_rgba(244,114,182,.16)]',
};

const sizes = {
  sm: { box: 'h-9 w-9 text-[11px]', icon: 16 },
  md: { box: 'h-11 w-11 text-[13px]', icon: 19 },
  lg: { box: 'h-20 w-20 text-xl', icon: 34 },
};

function initials(user) {
  const first = user?.prenom?.[0] || '';
  const last = user?.nom?.[0] || '';
  return `${first}${last}`.toUpperCase() || 'OF';
}

export default function ProfileAvatar({ user, size = 'md', className = '' }) {
  const cfg = sizes[size] || sizes.md;
  const Icon = PROFILE_ICONS[user?.profile_icon];
  const colorClass = PROFILE_COLORS[user?.profile_color] || 'bg-cyan-500/20 text-cyan-100 border-cyan-300/30 shadow-[0_0_28px_rgba(34,211,238,.16)]';

  return (
    <div
      className={clsx(
        'profile-avatar inline-flex shrink-0 items-center justify-center rounded-full border font-black transition duration-150',
        cfg.box,
        colorClass,
        className,
      )}
      title={user?.nom_complet || `${user?.prenom || ''} ${user?.nom || ''}`.trim() || 'OFPPT'}
    >
      {Icon ? <Icon size={cfg.icon} strokeWidth={2.2} /> : initials(user)}
    </div>
  );
}
