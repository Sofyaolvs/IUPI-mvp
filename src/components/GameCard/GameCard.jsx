import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import defaultImage from '../../assets/Telahorizontal.svg';

const GameCard = ({ image, cardImage, title, subject, id, isInstalled, path, executablePath }) => {
  const navigate = useNavigate();
  const [displayImage, setDisplayImage] = useState(
    cardImage || image || defaultImage
  );
  
  console.log(`GameCard for ${title}, installed: ${isInstalled}, image: ${image?.substring(0, 50)}...`);

  const handleImageError = () => {
    console.log(`Image failed to load for ${title}, using default image`);
    setDisplayImage(defaultImage);
  };

  const handleGameCardClick = () => {
    if (isInstalled && executablePath) {
      // For installed games, launch the game
      console.log(`Launching installed game: ${title} at ${executablePath}`);
      window.electronAPI.openFileByPath(executablePath, title);
    } else {
      // For available games, navigate to game page
      console.log(`Navigating to game with id: ${id}, installed: ${isInstalled}`);
      navigate(`/game/${id}`);
    }
  };

  return (
    <div 
      className="game-card" 
      onClick={handleGameCardClick} 
      style={{ cursor: 'pointer' }}
    >
      <div className="game-image-container">
        <img 
          src={displayImage}
          alt={title || 'Game Image'} 
          className="game-image" 
          onError={handleImageError}
        />
        {isInstalled && (
          <div className="installed-badge">
            Installed
          </div>
        )}
      </div>
      <p className="game-title">{title || 'Untitled Game'}</p>
    </div>
  );
};

export default GameCard;