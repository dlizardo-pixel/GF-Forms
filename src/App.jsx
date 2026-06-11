import { Routes, Route } from 'react-router-dom';
import Home from './routes/Home.jsx';
import StandardForm from './routes/StandardForm.jsx';
import SektorkopplungForm from './routes/SektorkopplungForm.jsx';
import ThankYou from './routes/ThankYou.jsx';

/** Routing der Anwendung. */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/standard" element={<StandardForm />} />
      <Route path="/sektorkopplung" element={<SektorkopplungForm />} />
      <Route path="/danke" element={<ThankYou />} />
      {/* Unbekannte Pfade → Startseite */}
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
