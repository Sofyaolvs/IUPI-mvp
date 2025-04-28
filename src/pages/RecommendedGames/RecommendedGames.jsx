import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchGames } from '../../services/api.jsx';
import './RecommendedGames.css';
import defaultImage from '../../assets/Telahorizontal.svg';
import Carousel from '../../components/Carousel/Carousel.jsx';

export default function RecommendedGames({ currentGame, maxRecommendations = 4 }) {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
  
    useEffect(() => {
      async function loadRecommendations() {
        if (!currentGame) return;
        
        try {
          setLoading(true);
          // Obter a lista completa de jogos
          const allGames = await fetchGames();
          
          // Extrair tags do jogo atual
          const currentTags = extractTags(currentGame);
          
          if (!currentTags.length) {
            setRecommendations([]);
            return;
          }
  
          //similaridade dos jogos
          const scoredGames = allGames
            .filter(game => game.id !== currentGame.id) // Excluir o jogo atual
            .map(game => {
              const gameTags = extractTags(game);
              const similarityScore = calculateSimilarityScore(currentTags, gameTags);
              return { ...game, similarityScore };
            })
            .filter(game => game.similarityScore > 0) // Apenas jogos com alguma similaridade
            .sort((a, b) => b.similarityScore - a.similarityScore) // Ordenar por similaridade
            .slice(0, maxRecommendations); // Limitar ao número máximo de recomendações
          
          setRecommendations(scoredGames);
        } catch (error) {
          console.error('Error loading recommendations:', error);
          setRecommendations([]);
        } finally {
          setLoading(false);
        }
      }
  
      loadRecommendations();
    }, [currentGame, maxRecommendations]);
  
    function extractTags(game) {
      if (!game || !game.tags) return [];
      
      return game.tags.map(tag => {
        // Se for um objeto com propriedade name
        if (typeof tag === 'object' && tag !== null && tag.name) {
          return tag.name.toLowerCase();
        }
        // Se for uma string
        else if (typeof tag === 'string') {
          return tag.toLowerCase();
        }
        return '';
      }).filter(Boolean); // Remover valores vazios
    }
  
    // Calcular pontuação de similaridade entre conjuntos de tags
    function calculateSimilarityScore(tags1, tags2) {
      if (!tags1.length || !tags2.length) return 0;
      
      // Contar quantas tags são comuns entre os dois jogos
      const commonTags = tags1.filter(tag => tags2.includes(tag));
      return commonTags.length;
    }
  
    // Lidar com erros de carregamento de imagem
    const handleImageError = (e) => {
      e.target.src = defaultImage;
      e.target.alt = 'Imagem não disponível';
    };
  
    // Navegar para o jogo recomendado
    const handleGameClick = (gameId) => {
      navigate(`/game/${gameId}`);
    };
  
    if (loading) {
      return <div className="recommendations-loading">Carregando recomendações...</div>;
    }
  
    if (!recommendations.length) {
      return <div className="no-recommendations">Não há recomendações disponíveis</div>;
    }
  
    return (
      <div className="game-recommendations">
        <Carousel title="Jogos recomendados">
          {recommendations.map(game => (
            <div 
              key={game.id} 
              className="recommendation-card"
              onClick={() => handleGameClick(game.id)}
            >
              <div className="recommendation-image">
                <img 
                  src={game.cardImage || game.image || defaultImage} 
                  alt={game.title || game.name}
                  onError={handleImageError}
                />
              </div>
              <div className="recommendation-title">
                {game.title || game.name}
              </div>
            </div>
          ))}
        </Carousel>
      </div>
    );
  }