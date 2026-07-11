import { Routes, Route, Navigate } from 'react-router-dom';
import { useBusinessStore } from './stores/useBusinessStore';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';

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
    </Routes>
  );
}
