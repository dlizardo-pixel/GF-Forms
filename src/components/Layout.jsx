/** Gemeinsame Layout-Bausteine: Kopfzeile, Fortschrittsanzeige, Schritt-Übergang. */
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LOGOS } from '../lib/brandAssets.js';

/** Kopfzeile mit offiziellem GreenFusion-Logo (Green-Variante auf hellem Grund). */
export function TopBar() {
  return (
    <div className="gf-topbar">
      <Link to="/" className="gf-logo" aria-label="GreenFusion – Startseite">
        <img src={LOGOS.horizontalGreen} alt="GreenFusion" />
      </Link>
    </div>
  );
}

/** Fortschrittsanzeige (0–100 %) mit Beschriftung und Prozentwert. */
export function Progress({ percent, label }) {
  const pct = Math.round(Math.max(0, Math.min(100, percent)));
  return (
    <div className="gf-progress">
      <div className="gf-progress-track">
        <div className="gf-progress-bar" style={{ width: `${pct}%` }} />
      </div>
      {label && (
        <div className="gf-progress-label">
          <span>{label}</span>
          <span className="gf-progress-pct">{pct}%</span>
        </div>
      )}
    </div>
  );
}

/**
 * Schritt-Wrapper mit leichtem Übergang (kein dekoratives Animieren):
 * 180 ms Fade + minimaler Versatz, Easing nach Design System v2.
 */
export function Step({ children, stepKey }) {
  return (
    <motion.div
      key={stepKey}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
