export default function OFPPTLogo({ className = '', compact = false }) {
  return (
    <svg className={className} viewBox="0 0 220 220" role="img" aria-label="Logo OFPPT">
      <defs>
        <radialGradient id="ofpptDisc" cx="45%" cy="35%" r="72%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="72%" stopColor="#f4f6f7" />
          <stop offset="100%" stopColor="#e5e7eb" />
        </radialGradient>
        <filter id="ofpptShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#0f172a" floodOpacity="0.15" />
        </filter>
      </defs>

      <circle cx="110" cy="110" r="102" fill="url(#ofpptDisc)" filter="url(#ofpptShadow)" />
      <circle cx="110" cy="110" r="96" fill="none" stroke="#ffffff" strokeWidth="5" />

      <g fill="none" strokeLinecap="square" strokeLinejoin="miter" strokeWidth="10">
        <path d="M70 70 L102 98 L70 126 L38 98 Z" stroke="#00965e" />
        <path d="M110 70 L142 98 L110 126 L78 98 Z" stroke="#8f9aa3" />
        <path d="M150 70 L182 98 L150 126 L118 98 Z" stroke="#0065a8" />
      </g>

      {!compact && (
        <>
          <text x="110" y="160" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="36" fontWeight="500" fill="#111827">
            OFPPT
          </text>
          <text x="110" y="185" textAnchor="middle" fontFamily="Georgia, serif" fontSize="15" fontStyle="italic" fill="#005a9c">
            La Voie de l'Avenir
          </text>
        </>
      )}
    </svg>
  );
}
