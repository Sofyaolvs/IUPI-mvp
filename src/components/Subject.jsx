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
    <div className="carousel-container-subject">
      <div className="carousel-content-subject">
        <button className="nav-button prev-button side-button-subject" onClick={scrollLeft}>
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="15" viewBox="0 0 1024 1024">
            <path fill="#090B81" d="M752.145 0c8.685 0 17.572 3.434 24.237 10.099c13.33 13.33 13.33 35.143 0 48.473L320.126 515.03l449.591 449.591c13.33 13.33 13.33 35.144 0 48.474s-35.142 13.33-48.472 0L247.418 539.268c-13.33-13.33-13.33-35.144 0-48.474L727.91 10.1C734.575 3.435 743.46.002 752.146.002z"/>
          </svg>            
        </button>
        <div className="carousel-items-subject" ref={carouselRef} onScroll={handleScroll}>
          {subjects.map((subject) => (
            <div key={subject.id} className="subject-card-subject">
              <div className="subject-image-container-subject">
                <img src={subject.image} alt={subject.title} className="subject-image" />
              </div>
              <h3 className="carousel-title-subject">{subject.title}</h3>
            </div>
          ))}
        </div>
        <button className="nav-button next-button side-button-subject" onClick={scrollRight}>
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="15" viewBox="0 0 1024 1024">
            <path fill="#090B81" d="M271.653 1023.192c-8.685 0-17.573-3.432-24.238-10.097c-13.33-13.33-13.33-35.144 0-48.474L703.67 508.163L254.08 58.573c-13.33-13.331-13.33-35.145 0-48.475s35.143-13.33 48.473 0L776.38 483.925c13.33 13.33 13.33 35.143 0 48.473l-480.492 480.694c-6.665 6.665-15.551 10.099-24.236 10.099z"/>
          </svg>    
        </button>
      </div>
    </div>
  );
};

export default Subject;