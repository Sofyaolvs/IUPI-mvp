import * as React from 'react';
import { createRoot } from 'react-dom/client';
import GameManager from './components/GameManager.jsx';
// import Teste from './components/teste.jsx'; // Só se quiser manter

const root = createRoot(document.body);

root.render(
  <>
    <h2>POC Itch.io</h2>
    {/* <Teste /> */} {/* Descomente se quiser testar algo específico */}
    <GameManager />
  </>
);
