import * as React from 'react'
import { createRoot } from 'react-dom/client'
import Teste from './components/teste.jsx';
import GameManager from './components/GameManager.jsx';

const root = createRoot(document.body);

root.render(
  <>
    <h2>teste react</h2>
    <Teste/> 
    <GameManager/>
  </>
);