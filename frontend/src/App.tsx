import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Planning from './pages/PlanningPage/Planning';
import Plans from './pages/PlansPage/Plans';
import Programs from './pages/ProgramsPage/Programs'
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/planning/:planId" element={<Planning />} />
        <Route path="/planning" element={<Planning />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/programs/:planId" element={<Programs />} />
        <Route path="/programs" element={<Programs />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
