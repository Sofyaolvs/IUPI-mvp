import * as React from 'react'
import { createRoot } from 'react-dom/client'
import Teste from './components/teste.jsx';
import OutroTeste from './components/outroTeste.jsx';  // Nome corrigido com inicial maiúscula

const root = createRoot(document.body);

root.render(
  <>
    <h2>Hello com react</h2>
    <Teste/>
    <OutroTeste/>  
  </>
);