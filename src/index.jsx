import * as React from 'react'
import { createRoot } from 'react-dom/client'
import Teste from './components/teste';

const root = createRoot(document.body);
root.render(
    <div>
        <h2>Hello from react</h2>
    </div>
)
root.render(<Teste/>)