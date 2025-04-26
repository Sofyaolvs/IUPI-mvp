import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import GameManager from './pages/GameManager.jsx';
import Library from './pages/Library/Library.jsx';
import SubjectPage from './pages/SubjectsPage/SubjectPage.jsx';
import GamePage from './pages/GamePage/GamePage.jsx'; 
import AvailableGames from './pages/AvailableGames/AvaliableGames.jsx';
import InstalledGames from './pages/InstalledGames/InstalledGames.jsx';

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

          <Route path="/games" element={
            <>
              <Navigation />
              <div className="app-content">
                <SubjectPage />
              </div>
            </>
          } />

        <Route path="/available-games" element={
            <>
              <Navigation />
              <div className="app-content">
                <AvailableGames />
              </div>
            </>
          } />


          <Route path="/installed-games" element={
            <>
              <Navigation />
              <div className="app-content">
                <InstalledGames />
              </div>
            </>
          } />

          {/*caminho pros jogos especificos*/}
          <Route path="/subject/:subject" element={
            <>
              <Navigation />
              <div className="app-content">
                <SubjectPage />
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

          <Route path="/game/:id" element={
            <>
              <Navigation />
              <div className="app-content">
                <GamePage />
              </div>
            </>
          } />
        </Routes>
      </div>
    </Router>
  );
};

const root = createRoot(document.body);
root.render(<App />);