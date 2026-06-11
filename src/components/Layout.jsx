/** Gemeinsame Layout-Bausteine: Kopfzeile, Fortschrittsanzeige, animierte Schritte. */
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export function Logo() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#062726" />
      <path d="M44 20c-12 0-20 8-20 18 0 1.5.2 3 .6 4.3C18 39 14 33 14 26c0 0 12 2 16-8 0 0 8 0 14 2z" fill="#3AD99F" />
      <circle cx="38" cy="40" r="6" fill="#3AD99F" />
    </svg>
  );
}

export function TopBar() {
  return (
    <div className="gf-topbar">
      <Link to="/" className="gf-logo">
        <Logo />
        <span>Green Fusion · Anlagen-Erfassung</span>
      </Link>
    </div>
  );
}

/** Fortschrittsanzeige (0–100 %) mit Beschriftung. */
export function Progress({ percent, label }) {
  return (
    <div className="gf-progress">
      <div className="gf-progress-track">
        <div className="gf-progress-bar" style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
      </div>
      {label && <div className="gf-progress-label">{label}</div>}
    </div>
  );
}

/** Animierter Schritt-Wrapper – sanfte Übergänge wie bei Typeform. */
export function Step({ children, stepKey }) {
  return (
    <motion.div
      key={stepKey}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
