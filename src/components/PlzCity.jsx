import { useState } from 'react';
import { TextField } from './Fields.jsx';
import { lookupPlz } from '../lib/plz.js';

/**
 * PLZ + Stadt als Paar. Sobald 5 Ziffern eingegeben sind, wird die Stadt
 * automatisch ermittelt (und Koordinaten gemerkt). Die Stadt bleibt jederzeit
 * überschreibbar.
 *
 * `onPatch(partial)` aktualisiert mehrere Felder gleichzeitig im Eltern-State
 * (plz, city, lat, lng).
 */
export default function PlzCity({ plz, city, onPatch }) {
  const [loading, setLoading] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  async function handlePlz(value) {
    onPatch({ plz: value });
    if (/^\d{5}$/.test(value.trim())) {
      setLoading(true);
      const res = await lookupPlz(value);
      setLoading(false);
      if (res) {
        onPatch({ city: res.city, lat: res.lat, lng: res.lng });
        setAutoFilled(true);
      }
    }
  }

  return (
    <div className="gf-row2">
      <TextField label="PLZ" value={plz} onChange={handlePlz} required placeholder="z. B. 10115" />
      <div>
        <TextField
          label="Stadt"
          value={city}
          onChange={(v) => {
            onPatch({ city: v });
            setAutoFilled(false);
          }}
          required
          help={loading ? 'Stadt wird ermittelt…' : autoFilled ? 'Automatisch aus der PLZ ergänzt – bei Bedarf überschreibbar.' : undefined}
        />
      </div>
    </div>
  );
}
