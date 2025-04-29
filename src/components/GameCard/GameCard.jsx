import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import defaultImage from '../../assets/Telahorizontal.svg';

const GameCard = ({ image, cardImage, title, subject, id, isInstalled, path, executablePath, tags, description, url }) => {
  const navigate = useNavigate();
  const [displayImage, setDisplayImage] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Load the image on component mount
  useEffect(() => {
    let isMounted = true;
    
    const loadImage = async () => {
      try {
        // For installed games with local paths
        if (isInstalled) {
          // First try to get image from the provided paths
          const imgPath = cardImage || image;
          
          if (imgPath) {
            // Try to load via the getImageBase64 API if available
            if (window.electronAPI && window.electronAPI.getImageBase64) {
              try {
                const base64Data = await window.electronAPI.getImageBase64(imgPath);
                if (base64Data && isMounted) {
                  setDisplayImage(base64Data);
                  setImageLoaded(true);
                  return;
                }
              } catch (err) {
                console.log(`Error loading image via API: ${err.message}`);
              }
            }
          }
          
          // If we have a path but no image loaded yet, try to load from the game folder
          if (path && isMounted && window.electronAPI && window.electronAPI.getImageBase64) {
            try {
              // Try with the common screenshot path pattern
              const screenshotPath = `${path}/images/screenshot-1.jpg`;
              const base64Data = await window.electronAPI.getImageBase64(screenshotPath);
              
              if (base64Data && isMounted) {
                setDisplayImage(base64Data);
                setImageLoaded(true);
                return;
              }
            } catch (err) {
              console.log(`Error loading screenshot image: ${err.message}`);
            }
          }
        }
        
        // For non-installed games or if all else fails
        if (isMounted) {
          setDisplayImage(cardImage || image || defaultImage);
          setImageLoaded(true);
        }
      } catch (error) {
        console.error(`Error loading image for ${title}:`, error);
        if (isMounted) {
          setDisplayImage(defaultImage);
          setImageLoaded(true);
        }
      }
    };
    
    // Start loading the image
    loadImage();
    
    // Cleanup function for when component unmounts
    return () => {
      isMounted = false;
    };
  }, [isInstalled, cardImage, image, path, title]);
  
  // Fallback if the image fails to load
  const handleImageError = () => {
    console.log(`Image failed to load for ${title}, using default image`);
    setDisplayImage(defaultImage);
  };

  const handleGameCardClick = () => {
    if (isInstalled && executablePath) {
      // For installed games, navigate to the game page with all available info
      console.log(`Game clicked: ${title}, is installed: ${isInstalled}`);
      
      // Use the game's title as ID for installed games if id is not already prefixed
      const gameId = id && id.startsWith('installed-') ? id : `installed-${title}`;
      
      // Store game data in sessionStorage to access it on the game page
      const gameData = {
        id: gameId,
        title: title,
        name: title,
        image: displayImage,
        images: [displayImage], // Put the main image in an array for the carousel
        description: description || '',
        tags: tags || [],
        subject: subject || '',
        installed: true,
        executablePath: executablePath,
        path: path,
        url: url
      };
      
      sessionStorage.setItem('installedGameData', JSON.stringify(gameData));
      navigate(`/game/${gameId}`);
    } else {
      // For available games, navigate to the game page normally
      console.log(`Navigating to game with id: ${id}, installed: ${isInstalled}`);
      navigate(`/game/${id}`);
    }
  };

  return (
    <div className="game-card" onClick={handleGameCardClick} style={{ cursor: 'pointer' }}>
      <div className="game-image-container">
        {!imageLoaded ? (
          <div className="loading-spinner"></div>
        ) : (
          <img 
            src={displayImage}
            alt={title || 'Imagem do Jogo'} 
            className="game-image" 
            onError={handleImageError}
          />
        )}
      </div>
      <p className="game-title">{title || 'Jogo sem título'}</p>
    </div>
  );
};

export default GameCard;