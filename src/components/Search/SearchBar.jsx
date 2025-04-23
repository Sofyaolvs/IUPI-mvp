import React, { useState, useCallback, useRef } from 'react';
import './SearchBar.css';

const SearchBar = ({ onSearch, placeholder = "Buscar jogos...", debounceTime = 300 }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const timerRef = useRef(null);
  
  // Função de debounce otimizada com useRef para persistir o timer
  const debouncedSearch = useCallback((value) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    setIsTyping(true);
    
    timerRef.current = setTimeout(() => {
      onSearch(value);
      setIsTyping(false);
    }, debounceTime);
  }, [onSearch, debounceTime]);
  
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (value === '') {
      // Se limpar o input, cancela qualquer debounce pendente
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      onSearch('');
      setIsTyping(false);
    } else {
      debouncedSearch(value);
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    // Cancela qualquer debounce pendente
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onSearch(searchTerm);
    setIsTyping(false);
  };
  
  const handleClear = () => {
    setSearchTerm('');
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onSearch('');
    setIsTyping(false);
  };
  
  return (
    <div className="search-bar">
      <form onSubmit={handleSubmit}>
        <div className="search-input-container">
          <input
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            placeholder={placeholder}
            aria-label="Buscar jogos"
          />
          {searchTerm && (
            <button 
              type="button" 
              className="clear-button" 
              onClick={handleClear}
              aria-label="Limpar busca"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                <path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41z"/>
              </svg>
            </button>
          )}
        </div>
        <button type="submit" aria-label="Buscar">
          {isTyping ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
              <path 
                d="M12 4 a8 8 0 0 1 8 8"
                fill="none" 
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 12 12"
                  to="360 12 12"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
              <path fill="currentColor" d="M9.5 16q-2.725 0-4.612-1.888T3 9.5t1.888-4.612T9.5 3t4.613 1.888T16 9.5q0 1.1-.35 2.075T14.7 13.3l5.6 5.6q.275.275.275.7t-.275.7t-.7.275t-.7-.275l-5.6-5.6q-.75.6-1.725.95T9.5 16m0-2q1.875 0 3.188-1.312T14 9.5t-1.312-3.187T9.5 5T6.313 6.313T5 9.5t1.313 3.188T9.5 14"/>
            </svg>
          )}
        </button>
      </form>
    </div>
  );
};

export default SearchBar;