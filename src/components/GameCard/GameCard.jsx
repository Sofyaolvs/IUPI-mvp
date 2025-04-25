import React from 'react';
import { useNavigate } from 'react-router-dom';
import defaultImage from '../../assets/Telahorizontal.svg';

const GameCard = ({ image, cardImage, title, subject, id, isInstalled, path, executablePath, tags, description, url }) => {
  const navigate = useNavigate();
  console.log(isInstalled + "-" + title);
  const [displayImage, setDisplayImage] = React.useState(
    cardImage || image || defaultImage
  );
    
  const handleImageError = () => {
    console.log('Image failed to load, using default image');
    setDisplayImage(defaultImage);
  };

  const handleGameCardClick = () => {
    if (isInstalled && executablePath) {
      // For installed games, we'll navigate to the game page with all available info
      console.log(`Game clicked: ${title}, is installed: ${isInstalled}`);
      
      // Use the game's title as ID for installed games if id is not already prefixed
      const gameId = id && id.startsWith('installed-') ? id : `installed-${title}`;
      
      // Store game data in sessionStorage to access it on the game page
      const gameData = {
        id: gameId,
        title: title,
        name: title,
        image: displayImage,
        images: [displayImage], // Put the main image in an array for the carousel
        description: description || '',
        tags: tags || [],
        subject: subject || '',
        installed: true,
        executablePath: executablePath,
        url: url
      };
      
      sessionStorage.setItem('installedGameData', JSON.stringify(gameData));
      navigate(`/game/${gameId}`);
    } else {
      // For available games, navigate to the game page normally
      console.log(`Navigating to game with id: ${id}, installed: ${isInstalled}`);
      navigate(`/game/${id}`);
    }
  };

  return (
    <div className="game-card" onClick={handleGameCardClick} style={{ cursor: 'pointer' }}>
      <div className="game-image-container">
        <img 
          src={displayImage}
          alt={title || 'Imagem do Jogo'} 
          className="game-image" 
          onError={handleImageError}
        />
        {isInstalled && (
          <div className="installed-badge">
            Instalado
          </div>
        )}
      </div>
      <p className="game-title">{title || 'Jogo sem título'}</p>
    </div>
  );
};

export default GameCard;