import React from 'react';
import './Loader.css';

// Importando SVGs
import SvgI from '../../assets/IUPI-SVG/I.svg';
import SvgU from '../../assets/IUPI-SVG/u.svg';
import SvgP from '../../assets/IUPI-SVG/P.svg';
import SvgExcl from '../../assets/IUPI-SVG/exclamation.svg';

function Loader() {
  return (
    <>
      <div className="wave-bouncing-loading-animation" role="alert" aria-busy="true" aria-label="Loading">
        <span style={{"--item": 1}} className="letra"><img src={SvgI} alt="I" /></span>
        <span style={{"--item": 2}} className="letra"><img src={SvgU} alt="U" /></span>
        <span style={{"--item": 3}} className="letra"><img src={SvgP} alt="P" /></span>
        <span style={{"--item": 4}} className="letra"><img src={SvgI} alt="I" /></span>
        <span style={{"--item": 5}} className="letra"><img src={SvgExcl} alt="!" /></span>
      </div>
    </>
  );
}

export default Loader;
