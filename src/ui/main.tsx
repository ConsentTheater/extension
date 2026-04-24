import { render } from 'preact';
import { App } from '@/ui/App';
import '@/ui/styles/globals.css';

const root = document.getElementById('root');
if (!root) throw new Error('ConsentTheater: #root not found');
render(<App />, root);
