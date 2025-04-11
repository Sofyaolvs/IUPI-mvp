import React from "react";
import GameCard from "./GameCard.jsx";

export const GameGrid = ({ games }) => {
  return (
    <div className="game-grid">
      {games.map((game) => (
        <GameCard
          key={game.id}
          image={game.image}
          title={game.title}
          altText={game.altText}
        />
      ))}
    </div>
  );
};

export default GameGrid;
