import { useEffect, useState, useRef } from 'react';

/**
 * Custom hook for lazy loading images
 * @param {string} src - The source URL of the image
 * @param {string} placeholder - Optional placeholder image to show while loading
 * @returns {Object} - Object containing the current source and loading state
 */
export const useLazyImage = (src, placeholder = '') => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const imageRef = useRef(null);
  
  useEffect(() => {
    let observer;
    let didCancel = false;
    
    // Handler when image comes into view
    const onIntersection = (entries) => {
      entries.forEach(entry => {
        // If element is in view
        if (entry.isIntersecting) {
          // Start loading image
          const image = new Image();
          image.src = src;
          image.onload = () => {
            if (!didCancel) {
              setImageSrc(src);
              setIsLoaded(true);
              // Disconnect after loading
              if (observer && imageRef.current) {
                observer.unobserve(imageRef.current);
              }
            }
          };
        }
      });
    };
    
    // Create an observer instance
    if (imageRef.current && IntersectionObserver) {
      observer = new IntersectionObserver(onIntersection, {
        rootMargin: '50px',
        threshold: 0.01
      });
      observer.observe(imageRef.current);
    } else {
      // Fallback for browsers that don't support IntersectionObserver
      setImageSrc(src);
    }
    
    // Clean up
    return () => {
      didCancel = true;
      if (observer && imageRef.current) {
        observer.unobserve(imageRef.current);
      }
    };
  }, [src, placeholder]);
  
  return { imageSrc, isLoaded, imageRef };
};

/**
 * Custom hook for preloading multiple images
 * @param {Array} srcArray - Array of image sources to preload
 * @returns {Object} - Object containing loading state
 */
export const usePreloadImages = (srcArray) => {
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    let isMounted = true;
    let loadedCount = 0;
    
    const preloadImage = (src) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = resolve;
        img.onerror = reject;
      });
    };
    
    const preloadAll = async () => {
      const promises = srcArray.map(src => 
        preloadImage(src).then(() => {
          if (isMounted) {
            loadedCount++;
            setProgress(Math.round((loadedCount / srcArray.length) * 100));
          }
        })
      );
      
      try {
        await Promise.all(promises);
        if (isMounted) {
          setLoaded(true);
        }
      } catch (error) {
        console.error('Error preloading images:', error);
        // Consider images loaded even if some fail
        if (isMounted) {
          setLoaded(true);
        }
      }
    };
    
    if (srcArray.length > 0) {
      preloadAll();
    } else {
      setLoaded(true);
    }
    
    return () => {
      isMounted = false;
    };
  }, [srcArray]);
  
  return { loaded, progress };
};

export default {
  useLazyImage,
  usePreloadImages
};
