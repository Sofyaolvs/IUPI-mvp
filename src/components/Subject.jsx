import React, { useRef, useState, useEffect } from 'react';

const Subject = ({ title, subjects }) => {
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
      </div>
      <div className="carousel-content">
        {!isAtStart && (
          <button className="nav-button prev-button side-button" onClick={scrollLeft}>
            <span className="arrow-icon">&#10094;</span>
          </button>
        )}
        <div className="carousel-items" ref={carouselRef} onScroll={handleScroll}>
          {subjects.map((subject) => (
            <div key={subject.id} className="subject-card">
              <div className="subject-image-container">
                <img src={subject.image} alt={subject.title} className="subject-image" />
              </div>
              <h3 className="subject-title">{subject.title}</h3>
            </div>
          ))}
        </div>
        <button className="nav-button next-button side-button" onClick={scrollRight}>
          <span className="arrow-icon">&#10095;</span>
        </button>
      </div>
    </div>
  );
};

export default Subject;