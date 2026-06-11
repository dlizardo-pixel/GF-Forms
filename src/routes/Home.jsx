import { Link, useLocation } from 'react-router-dom';
import { TopBar } from '../components/Layout.jsx';
import { ICONS } from '../lib/brandAssets.js';

/**
 * Startseite mit Auswahl des Formulartyps.
 * Etwaige Query-Parameter (für vorausgefüllte Links, Stufe 2) werden an die
 * Formularseiten weitergereicht.
 */
export default function Home() {
  const { search } = useLocation();

  return (
    <div className="gf-page">
      <TopBar />
      <div className="gf-center">
        <div className="gf-hero">
          <span className="gf-eyebrow">Green Fusion</span>
          <h1>Erfassen Sie Ihre Heizungsanlagen – schnell und einfach</h1>
          <p>
            Mit Ihren Angaben erstellen wir eine Wirtschaftlichkeitsanalyse für Ihre Liegenschaften.
            Wählen Sie den passenden Formulartyp:
          </p>

          <div className="gf-typecards">
            <Link to={`/standard${search}`} className="gf-typecard">
              <img src={ICONS.heating} alt="" className="gf-typecard-icon" />
              <span className="gf-badge">Heizungsoptimierung</span>
              <h2>Standard Business Case</h2>
              <p>
                Für die klassische Heizungsoptimierung – ideal auch für viele Liegenschaften
                (z. B. Gas, Fernwärme, BHKW, Öl oder Pellets).
              </p>
            </Link>

            <Link to={`/sektorkopplung${search}`} className="gf-typecard">
              <img src={ICONS.heatpumpLg} alt="" className="gf-typecard-icon" />
              <span className="gf-badge">Wärmepumpe · PV · Speicher</span>
              <h2>Sektorkopplung</h2>
              <p>
                Für Anlagen mit Wärmepumpe, PV-Anlage und/oder Batteriespeicher – mit Erfassung der
                einzelnen Komponenten.
              </p>
            </Link>
          </div>

          <p style={{ fontSize: 13, marginTop: 32 }}>
            Ihre Daten werden ausschließlich zur Erstellung der Wirtschaftlichkeitsanalyse durch Green
            Fusion verarbeitet.
          </p>
        </div>
      </div>
    </div>
  );
}
