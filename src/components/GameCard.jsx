import React from 'react';

const GameCard = ({ image, title }) => {
  return (
    <div className="game-card">
      <div className="game-image-container">
        <img src={image} alt={title} className="game-image" />
      </div>
      <p className="game-title">{title}</p>
    </div>
  );
};

export default GameCard;