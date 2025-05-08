import React from 'react';
import './Loader.css';

function Loader() {
  return (
    <>

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      <link href="https://fonts.googleapis.com/css2?family=Cherry+Bomb+One&family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&display=swap" rel="stylesheet" />
      
      <div className="wave-bouncing-loading-animation" role="alert" aria-busy="true" aria-label="Loading">
        <span style={{"--item": 1}} className="letra">I</span>
        <span style={{"--item": 2}} className="letra">U</span>
        <span style={{"--item": 3}} className="letra">P</span>
        <span style={{"--item": 4}} className="letra">I</span>
        <span style={{"--item": 5}} className="letra">!</span>
      </div>
    </>
  );
}

export default Loader;