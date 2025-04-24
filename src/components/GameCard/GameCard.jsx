import React from 'react';
import { useNavigate } from 'react-router-dom';
import defaultImage from '../../assets/Telahorizontal.svg';

const GameCard = ({ image, cardImage, title, subject, id }) => {
  const navigate = useNavigate();
  const [displayImage, setDisplayImage] = React.useState(
    cardImage || image || defaultImage
  );
    
  const handleImageError = () => {
    console.log('Image failed to load, using default image');
    setDisplayImage(defaultImage);
  };

  const handleGameCardClick = () => {
    // Navigate to the game page with the specific game id
    navigate(`/game/${id}`);
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
      </div>
      <p className="game-title">{title || 'Jogo sem título'}</p>
    </div>
  );
};

export default GameCard;