import React, { useRef, useState, useEffect } from 'react';
import './Carousel.css';

const Carousel = ({ title, children, onSeeMore }) => {
  const carouselRef = useRef(null);
  const [isAtStart, setIsAtStart] = useState(true);
  const [isAtEnd, setIsAtEnd] = useState(false);

  const checkScrollPosition = () => {
    if (!carouselRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    setIsAtStart(scrollLeft <= 10); // margem de 10px
    const atEnd = Math.abs((scrollLeft + clientWidth) - scrollWidth) < 10;
    setIsAtEnd(atEnd);
  };

  useEffect(() => {
    const carousel = carouselRef.current;
    if (carousel) {
      carousel.addEventListener('scroll', checkScrollPosition);
      checkScrollPosition();
      
      return () => {
        carousel.removeEventListener('scroll', checkScrollPosition);
      };
    }
  }, []);

  const scrollLeft = () => {
    if (carouselRef.current) {
      const itemWidth = carouselRef.current.offsetWidth / 3; // ⅓ da largura visível
      carouselRef.current.scrollBy({
        left: -itemWidth,
        behavior: 'smooth'
      });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      const itemWidth = carouselRef.current.offsetWidth / 3;
      carouselRef.current.scrollBy({
        left: itemWidth,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="carousel-wrapper">
      <div className="carousel-header">
        <h2 className="carousel-title" onClick={onSeeMore} style={{ cursor: onSeeMore ? 'pointer' : 'default' }}>
          {title}
        </h2>
        
        <div className="carousel-navigation">
          <button 
            className={`nav-button prev-button ${isAtStart ? 'disabled' : ''}`}
            onClick={scrollLeft}
            disabled={isAtStart}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="12" viewBox="0 0 1024 1024">
              <path fill="currentColor" d="M752.145 0c8.685 0 17.572 3.434 24.237 10.099c13.33 13.33 13.33 35.143 0 48.473L320.126 515.03l449.591 449.591c13.33 13.33 13.33 35.144 0 48.474s-35.142 13.33-48.472 0L247.418 539.268c-13.33-13.33-13.33-35.144 0-48.474L727.91 10.1C734.575 3.435 743.46.002 752.146.002z"/>
            </svg>            
          </button>
          <button 
            className={`nav-button next-button ${isAtEnd ? 'disabled' : ''}`}
            onClick={scrollRight}
            disabled={isAtEnd}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="12" viewBox="0 0 1024 1024">
              <path fill="currentColor" d="M271.653 1023.192c-8.685 0-17.573-3.432-24.238-10.097c-13.33-13.33-13.33-35.144 0-48.474L703.67 508.163L254.08 58.573c-13.33-13.331-13.33-35.145 0-48.475s35.143-13.33 48.473 0L776.38 483.925c13.33 13.33 13.33 35.143 0 48.473l-480.492 480.694c-6.665 6.665-15.551 10.099-24.236 10.099z"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="carousel-items" ref={carouselRef} onScroll={checkScrollPosition}>
        {children}
      </div>
    </div>
  );
};

export default Carousel;