import { Routes, Route, Navigate } from 'react-router-dom';
import { useBusinessStore } from './stores/useBusinessStore';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import FixCenter from './pages/FixCenter';
import Projects from './pages/Projects';

export default function App() {
  const { businessId } = useBusinessStore();

  return (
    <Routes>
      <Route path="/" element={
        businessId ? <Navigate to="/dashboard" /> : <Onboarding />
      } />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/dashboard" element={
        businessId ? <Dashboard /> : <Navigate to="/" />
      } />
      <Route path="/fix-center" element={
        businessId ? <FixCenter /> : <Navigate to="/" />
      } />
      <Route path="/projects" element={<Projects />} />
    </Routes>
  );
}
