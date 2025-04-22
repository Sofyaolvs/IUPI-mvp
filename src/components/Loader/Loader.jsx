// src/components/Loader/Loader.jsx
import React from 'react';
import './Loader.css';

function Loader({ message = "Carregando..." }) {
  return (
    <div className="loader-container">
      <div className="circular-loader"></div>
      <p>{message}</p>
    </div>
  );
}

export default Loader;