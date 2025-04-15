import React from 'react';
import '../components/FilterButton.css';

const FilterPopup = ({ 
  isOpen, 
  onClose, 
  subjects, 
  gameTypes, 
  selectedSubjects, 
  selectedGameTypes, 
  toggleSubject, 
  toggleGameType, 
  handleClearFilters, 
  handleApplyFilters 
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="filter-popup-overlay"
      onClick={onClose}
    >
      <div 
        className="filter-popup"
        onClick={e => e.stopPropagation()} // Prevent clicks from closing the popup
      >
        <div className="filter-popup-header">
          <h2 style={{ color: '#090B81' }}>Filtro</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="filter-section">
          <h3>Matérias</h3>
          <div className="filter-options">
            {subjects.map(subject => (
              <button 
                key={subject.id}
                className={`filter-option ${selectedSubjects.includes(subject.id) ? 'selected' : ''}`}
                onClick={() => toggleSubject(subject.id)}
              >
                {subject.name}
              </button>
            ))}
          </div>
        </div>
        
        <div className="filter-section">
          <h3>Tipos de Jogos</h3>
          <div className="filter-options">
            {gameTypes.map(gameType => (
              <button 
                key={gameType.id}
                className={`filter-option ${selectedGameTypes.includes(gameType.id) ? 'selected' : ''}`}
                onClick={() => toggleGameType(gameType.id)}
              >
                {gameType.name}
              </button>
            ))}
          </div>
        </div>
        
        <div className="filter-actions">
          <button className="filter-action-button clear" onClick={handleClearFilters}>Limpar</button>
          <button className="filter-action-button save" onClick={handleApplyFilters}>Salvar</button>
        </div>
      </div>
    </div>
  );
};

export default FilterPopup;