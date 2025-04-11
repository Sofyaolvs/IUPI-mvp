import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import GameManager from './pages/GameManager.jsx';
import Library from './pages/Library.jsx';
import SearchBar from './components/SearchBar.jsx';
import Subject from './components/Subject.jsx';

const Navigation = () => {
  const navigate = useNavigate();
  


  return (
    <div></div>
  );
};

const App = () => {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={
            <>
              <Navigation />
              <div className="app-content">
                <Library />
              </div>
            </>
          } />
          <Route path="/game-manager" element={
            <>
              <Navigation />
              <div className="app-content">
                <GameManager />
              </div>
            </>
            
          } />
          <Route path="/subject/:id" element={
            <>
              <Navigation />
              <div className="app-content">
                <Subject />
              </div>
            </>
          } />
          {/* Você pode adicionar outras rotas aqui, como uma rota de resultados de busca */}
        </Routes>
      </div>
    </Router>
  );
};

const root = createRoot(document.body);
root.render(<App />);