// React loader script - ensures React is properly loaded before mounting
(function() {
  console.log('React Loader: Initializing...');
  
  // Function to load a script and return a promise
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => {
        console.log(`React Loader: Successfully loaded ${src}`);
        resolve();
      };
      script.onerror = (error) => {
        console.error(`React Loader: Failed to load ${src}`, error);
        reject(new Error(`Failed to load ${src}`));
      };
      document.head.appendChild(script);
    });
  }

  // Check if React is already loaded
  if (window.React && window.ReactDOM) {
    console.log('React Loader: React is already loaded in the global scope.');
    return;
  }

  // Load React scripts
  Promise.all([
    loadScript('https://unpkg.com/react@17/umd/react.development.js'),
    loadScript('https://unpkg.com/react-dom@17/umd/react-dom.development.js')
  ])
  .then(() => {
    // Check if loading was successful
    if (window.React && window.ReactDOM) {
      console.log(`React Loader: React ${window.React.version} successfully loaded`);
      
      // Dispatch a custom event to notify that React is ready
      const event = new CustomEvent('reactReady', { detail: { version: window.React.version }});
      window.dispatchEvent(event);
    } else {
      console.error('React Loader: React or ReactDOM not found in global scope after loading scripts');
    }
  })
  .catch(error => {
    console.error('React Loader: Error loading React scripts', error);
  });
})();