import React, { useState, useCallback } from 'react';
import './SearchBar.css';

const SearchBar = ({ onSearch, placeholder = "Buscar jogos...", debounceTime = 500 }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // evitar recriação da função onSearch em cda redenrizaçao
  const debouncedSearch = useCallback(
    (() => {
      let timer;
      return (value) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          onSearch(value);
        }, debounceTime);
      };
    })(),
    [onSearch, debounceTime]
  );
  
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (value === '') {
      onSearch('');
    } else {
      debouncedSearch(value);
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(searchTerm);
  };
  
  return (
    <div className="search-bar">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          placeholder={placeholder}
          aria-label="Buscar jogos"
        />
        <button type="submit" aria-label="Buscar">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path fill="currentColor" d="M9.5 16q-2.725 0-4.612-1.888T3 9.5t1.888-4.612T9.5 3t4.613 1.888T16 9.5q0 1.1-.35 2.075T14.7 13.3l5.6 5.6q.275.275.275.7t-.275.7t-.7.275t-.7-.275l-5.6-5.6q-.75.6-1.725.95T9.5 16m0-2q1.875 0 3.188-1.312T14 9.5t-1.312-3.187T9.5 5T6.313 6.313T5 9.5t1.313 3.188T9.5 14"/>
          </svg>
        </button>
      </form>
    </div>
  );
};

export default SearchBar;