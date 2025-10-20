import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import LandingPage from './components/LandingPage.jsx';
import MainApp from './components/MainApp.jsx';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<MainApp />} />
      </Routes>
      <Toaster position="top-right" richColors />
    </Router>
  );
}

export default App;
