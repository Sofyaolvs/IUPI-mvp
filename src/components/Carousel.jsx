import React, { useRef } from 'react';

const Carousel = ({ title, children }) => {
  const carouselRef = useRef(null);

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({
        left: -300,
        behavior: 'smooth'
      });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({
        left: 300,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="carousel-container">
      <div className="carousel-header">
        <h2 className="carousel-title">{title}</h2>
        <div className="carousel-navigation">
          <button className="nav-button prev-button" onClick={scrollLeft}>
            <span className="arrow-icon">&#10094;</span>
          </button>
          <button className="nav-button next-button" onClick={scrollRight}>
            <span className="arrow-icon">&#10095;</span>
          </button>
        </div>
      </div>
      <div className="carousel-items" ref={carouselRef}>
        {children}
      </div>
    </div>
  );
};

export default Carousel;