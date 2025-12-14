import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Planning from './pages/PlanningPage/Planning';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/planning" element={<Planning />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
