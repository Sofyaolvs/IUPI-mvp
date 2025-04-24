import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// Adjust these import paths to match your project structure
import GameCard from '../../components/GameCard/GameCard.jsx';
import Loader from '../../components/Loader/Loader.jsx';
import { fetchGames } from '../../services/api.jsx';

// Import any necessary styles
import './SubjectPage.css';

const SubjectPage = () => {
  const navigate = useNavigate();
  const { subject } = useParams(); // subject da URL
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [subjectName, setSubjectName] = useState('');

  // p ver se bate com os valores do enum q vem da api
  const subjectDisplayNames = {
    'portugues': 'Língua Portuguesa',
    'matematica': 'Matemática',
    'ciencias': 'Ciências',
    'geografia': 'Geografia',
    'historia': 'História',
    'arte': 'Arte'
  };

  useEffect(() => {
    const loadGames = async () => {
      setIsLoading(true);
      try {
        const allGames = await fetchGames();
        console.log("All games:", allGames);
        
        
        const subjectEnum = subject.toUpperCase();
        
        const filteredGames = allGames.filter(game => {
         
          return game.subject === subjectEnum;
        });
        
        console.log(`Filtered games for subject "${subject}":`, filteredGames);
        

        const displayName = subjectDisplayNames[subject.toLowerCase()] || 
                          subject.charAt(0).toUpperCase() + subject.slice(1).toLowerCase();
        setSubjectName(displayName);
        
        setGames(filteredGames);
        setError('');
      } catch (err) {
        console.error("Error loading games:", err);
        setError(`Erro ao carregar jogos: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (subject) {
      loadGames();
    }
  }, [subject]);

  const goBack = () => {
    navigate(-1);
  };

  return (
    <div className="subject-page">
      <header className="subject-header">
        <button className="back-button" onClick={goBack}>
          ← Voltar
        </button>
        <h1 className="subject-title">{subjectName}</h1>
      </header>

      <main className="subject-content">
        {error && <p className="error-message">{error}</p>}

        {isLoading ? (
          <Loader message="Carregando jogos" />
        ) : (
          <div className="games-grid">
            {games.length > 0 ? (
              games.map(game => (
                <GameCard
                  key={game.id}
                  image={game.image || game.cardImage}
                  title={game.name || game.title}
                  subject={game.subject}
                  tags={game.tags}
                  onClick={() => navigate(`/game/${game.id}`)}
                />
              ))
            ) : (
              <p className="no-games-message">
                Nenhum jogo encontrado para esta matéria.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default SubjectPage;