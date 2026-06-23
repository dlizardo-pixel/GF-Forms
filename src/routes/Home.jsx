import { Link, useLocation } from 'react-router-dom';
import { TopBar } from '../components/Layout.jsx';
import { ICONS } from '../lib/brandAssets.js';

/**
 * Startseite mit Auswahl in Kundensprache.
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
          <h1>Worum geht's bei Ihnen?</h1>
          <p>Damit wir Ihnen die richtigen Fragen stellen — und nicht mehr als nötig.</p>

          <div className="gf-typecards">
            <Link to={`/standard${search}`} className="gf-typecard">
              <img src={ICONS.heating} alt="" className="gf-typecard-icon" />
              <h2>Klassische Heizung optimieren</h2>
              <p>
                Gas, Fernwärme oder Öl. Keine Wärmepumpe, kein Solarstrom im Spiel — Sie wollen einfach, dass
                die Anlagen sparsamer laufen.
              </p>
            </Link>

            <Link to={`/sektorkopplung${search}`} className="gf-typecard">
              <img src={ICONS.heatpumpLg} alt="" className="gf-typecard-icon" />
              <h2>Wärmepumpe und/oder Solar mitdenken</h2>
              <p>
                Sie haben eine Wärmepumpe, eine PV-Anlage oder beides — und wollen, dass die sinnvoll
                zusammenspielen.
              </p>
            </Link>

            <Link to={`/standard${search ? search + '&' : '?'}both=1`} className="gf-typecard">
              <img src={ICONS.tools} alt="" className="gf-typecard-icon" />
              <h2>Ich möchte beides</h2>
              <p>
                Klassische Heizungen <em>und</em> Wärmepumpe/Solar. Wir gehen zuerst die klassischen Anlagen
                durch, danach die mit Wärmepumpe oder PV.
              </p>
            </Link>
          </div>

          <p style={{ fontSize: 14, marginTop: 28 }}>
            Nicht sicher? Nehmen Sie das Erste — den Rest klären wir gemeinsam. Wir müssen da nichts hetzen.
          </p>
        </div>
      </div>
    </div>
  );
}
