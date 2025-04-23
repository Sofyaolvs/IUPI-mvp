import React from 'react';
import './FilterButton.css';

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
          <button className="close-button" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48">
              <defs>
                <mask id="ipSCloseOne0">
                  <g fill="none" strokeLinejoin="round" strokeWidth="4">
                    <path fill="#fff" stroke="#fff" d="M24 44c11.046 0 20-8.954 20-20S35.046 4 24 4S4 12.954 4 24s8.954 20 20 20Z"/>
                    <path stroke="#000" strokeLinecap="round" d="M29.657 18.343L18.343 29.657m0-11.314l11.314 11.314"/>
                  </g>
                </mask>
              </defs>
              <path fill="#090B81" d="M0 0h48v48H0z" mask="url(#ipSCloseOne0)"/>
            </svg>
          </button>
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
                {selectedSubjects.includes(subject.id) && (
                  <svg className="selected-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 48 48">
                    <defs>
                      <mask id={`closeIconMask-${subject.id}`}>
                        <g fill="none" strokeLinejoin="round" strokeWidth="4">
                          <path fill="#fff" stroke="#fff" d="M24 44c11.046 0 20-8.954 20-20S35.046 4 24 4S4 12.954 4 24s8.954 20 20 20Z"/>
                          <path stroke="#000" strokeLinecap="round" d="M29.657 18.343L18.343 29.657m0-11.314l11.314 11.314"/>
                        </g>
                      </mask>
                    </defs>
                    <path fill="#090B81" d="M0 0h48v48H0z" mask={`url(#closeIconMask-${subject.id})`}/>
                  </svg>
                )}
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
                {selectedGameTypes.includes(gameType.id) && (
                  <svg className="selected-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 48 48">
                    <defs>
                      <mask id={`closeIconMask-${gameType.id}`}>
                        <g fill="none" strokeLinejoin="round" strokeWidth="4">
                          <path fill="#fff" stroke="#fff" d="M24 44c11.046 0 20-8.954 20-20S35.046 4 24 4S4 12.954 4 24s8.954 20 20 20Z"/>
                          <path stroke="#000" strokeLinecap="round" d="M29.657 18.343L18.343 29.657m0-11.314l11.314 11.314"/>
                        </g>
                      </mask>
                    </defs>
                    <path fill="#090B81" d="M0 0h48v48H0z" mask={`url(#closeIconMask-${gameType.id})`}/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
        
        <div className="filter-actions">
          <button 
            className="filter-action-button clear" 
            onClick={handleClearFilters}
            disabled={selectedSubjects.length === 0 && selectedGameTypes.length === 0}
          >
            Limpar
          </button>
          <button 
            className="filter-action-button save" 
            onClick={handleApplyFilters}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterPopup;