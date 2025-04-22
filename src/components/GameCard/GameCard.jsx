import React from 'react';
import defaultImage from '../../assets/Telahorizontal.svg';

  
const GameCard = ({ image, cardImage, title, subject}) => {

    const [displayImage, setDisplayImage] = React.useState(
      cardImage || image || defaultImage
    );
    
    const handleImageError = () => {
      console.log('Image failed to load, using default image');
      setDisplayImage(defaultImage);
    };
  return (
    <div className="game-card">
      <div className="game-image-container">
        <img src={displayImage}
         alt={title || 'Imagem do Jogo'} 
         className="game-image" 
         onError={handleImageError}/>
      </div>
      <p className="game-title">{title || 'Jogo sem título'}</p>
    </div>
  );
};

export default GameCard;