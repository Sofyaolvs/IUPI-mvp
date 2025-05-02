import React, { useState, useCallback, useRef, useEffect } from 'react';
import './SearchBar.css';

const SearchBar = ({ onSearch, placeholder = "Buscar jogos...", debounceTime = 300, initialValue = '' }) => {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [isTyping, setIsTyping] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setSearchTerm(initialValue);
  }, [initialValue]);

  const debouncedSearch = useCallback((value) => {
    if (timerRef.current) clearTimeout(timerRef.current);
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
      if (timerRef.current) clearTimeout(timerRef.current);
      onSearch('');
      setIsTyping(false);
    } else {
      debouncedSearch(value);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (timerRef.current) clearTimeout(timerRef.current);
    onSearch(searchTerm);
    setIsTyping(false);
  };

  const handleClear = () => {
    setSearchTerm('');
    if (timerRef.current) clearTimeout(timerRef.current);
    onSearch('');
    setIsTyping(false);
  };

  const SearchIcon = () => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24"
      className="search-icon"
    >
      <path 
        fill="currentColor" 
        d="M9.5 16q-2.725 0-4.612-1.888T3 9.5t1.888-4.612T9.5 3t4.613 1.888T16 9.5q0 1.1-.35 2.075T14.7 13.3l5.6 5.6q.275.275.275.7t-.275.7t-.7.275t-.7-.275l-5.6-5.6q-.75.6-1.725.95T9.5 16m0-2q1.875 0 3.188-1.312T14 9.5t-1.312-3.187T9.5 5T6.313 6.313T5 9.5t1.313 3.188T9.5 14"
      />
    </svg>
  );

  return (
    <div className="search-bar">
      <form onSubmit={handleSubmit}>
        <div className="search-input-container">
          <input
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            placeholder={placeholder}
          />
          <button type="submit" className="search-button">
            <SearchIcon />
          </button>
        </div>
      </form>
      {searchTerm && (
        <button onClick={handleClear} className="clear-button">
          Limpar busca
        </button>
      )}
    </div>
  );
};

export default SearchBar;