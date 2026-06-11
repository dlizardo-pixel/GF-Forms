import { Link, useLocation } from 'react-router-dom';
import { TopBar } from '../components/Layout.jsx';

/** Dankeseite nach erfolgreichem Absenden. */
export default function ThankYou() {
  const { state } = useLocation();
  const mock = state?.mock;

  return (
    <div className="gf-page">
      <TopBar />
      <div className="gf-center">
        <div className="gf-thanks">
          <div className="gf-check">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="#28C391" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1>Geschafft — danke.</h1>
          <p>
            Wir rechnen Ihnen jetzt schwarz auf weiß aus, was Ihre Anlagen sparen können, und melden uns.
            Kein Verkaufsgespräch, erstmal nur die Zahlen. Wenn vorher Fragen aufkommen: einfach melden.
          </p>
          {mock && (
            <p style={{ fontSize: 13, color: 'var(--gf-sunstone)', marginTop: 16 }}>
              Hinweis (nur lokal/Test): Es wurde keine echte E-Mail verschickt, da kein Brevo-Schlüssel
              hinterlegt ist.
            </p>
          )}
          <div style={{ marginTop: 28 }}>
            <Link to="/" className="gf-btn gf-btn-ghost">
              Zur Startseite
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
