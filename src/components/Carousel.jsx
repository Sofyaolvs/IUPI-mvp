import React, { useRef, useState, useEffect } from 'react';
import './Carousel.css';

const Carousel = ({ title, children }) => {
  const carouselRef = useRef(null);
  const [isAtStart, setIsAtStart] = useState(true);
  
  // Track scroll position
  const handleScroll = () => {
    if (carouselRef.current) {
      setIsAtStart(carouselRef.current.scrollLeft === 0);
    }
  };
  
  // Set up scroll event listener
  useEffect(() => {
    const carousel = carouselRef.current;
    if (carousel) {
      carousel.addEventListener('scroll', handleScroll);
      return () => carousel.removeEventListener('scroll', handleScroll);
    }
  }, []);

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
          {!isAtStart && (
            <button className="nav-button prev-button" onClick={scrollLeft}>
              <span className="arrow-icon">&#10094;</span>
            </button>
          )}
          <button className="nav-button next-button" onClick={scrollRight}>
            <span className="arrow-icon">&#10095;</span>
          </button>
        </div>
      </div>
      <div className="carousel-items" ref={carouselRef} onScroll={handleScroll}>
        {children}
      </div>
    </div>
  );
};

export default Carousel;