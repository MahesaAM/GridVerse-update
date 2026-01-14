import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  HashRouter as Router,
  Routes,
  Route,
} from 'react-router-dom';

import Background from './components/Background';
import Home from './pages/Home';
import Login from './pages/Login';
import ImageGenerator from './pages/ImageGenerator';

import WhiskGenerator from './pages/WhiskGenerator';
import GeneratorChoice from './pages/GeneratorChoice';
import Admin from './pages/Admin';


import './index.css';

console.log('React app starting...');

function App() {
  return (
    <>
      <Background />
      <Router>
        <div className="min-h-screen bg-gray-100">
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/generator-choice" element={<GeneratorChoice />} />
              <Route path="/image-generator" element={<ImageGenerator />} />

              <Route path="/whisk-generator" element={<WhiskGenerator />} />
              <Route path="/admin" element={<Admin />} />

            </Routes>
          </main>
        </div>
      </Router>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
