import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Planning from './pages/PlanningPage/Planning';
import Plans from './pages/PlansPage/Plans';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/planning/:planId" element={<Planning />} />
        <Route path="/planning" element={<Planning />} />
        <Route path="/plans" element={<Plans />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
