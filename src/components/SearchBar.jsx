import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import searchIcon from '@iconify/icons-fa-solid/search';
import './SearchBar.css';

const SearchBar = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchTerm);
    }
  };

  return (
    <div className="search-bar">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
        />
        <button type="submit">
          <Icon icon={searchIcon} className="search-icon" />
        </button>
      </form>
    </div>
  );
};

export default SearchBar;