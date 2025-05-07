import React from 'react';
import './Loader.css';

function Loader() {
  return (
<div className="wave-bouncing-loading-animation"  role="alert" aria-busy="true" aria-label="Loading">
    <span style={{"--item": 1}} className="letra">I</span>
    <span style={{"--item": 2}} className="letra">U</span>
    <span style={{"--item": 3}} className="letra">P</span>
    <span style={{"--item": 4}} className="letra">I</span>
    <span style={{"--item": 5}} className="letra">!</span>

</div>
  );
}

export default Loader;