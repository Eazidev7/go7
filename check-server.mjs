import http from 'http';

console.log('🔍 Checking if GO7 React app is running...');

const checkServer = (port) => {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (data.includes('GO7') || data.includes('root')) {
          console.log(`✅ Server responding on port ${port}`);
          console.log(`🌐 Open: http://localhost:${port}`);
          resolve(true);
        } else {
          console.log(`❌ Port ${port} - No React app detected`);
          resolve(false);
        }
      });
    });
    
    req.on('error', () => {
      console.log(`❌ Port ${port} - Not responding`);
      resolve(false);
    });
    
    req.setTimeout(2000, () => {
      console.log(`⏰ Port ${port} - Timeout`);
      req.destroy();
      resolve(false);
    });
  });
};

async function checkPorts() {
  console.log('Checking common development ports...');
  
  const ports = [8080, 3000, 5173, 4173];
  
  for (const port of ports) {
    await checkServer(port);
  }
  
  console.log('\n📋 Summary:');
  console.log('If server is running, your GO7 Home page should show:');
  console.log('• Hero section with GO7 branding');
  console.log('• Live Areas Map with Abeokuta locations');
  console.log('• Quick Categories (6 buttons)');
  console.log('• Food Vendors with ratings');
  console.log('• Local Markets grid');
  console.log('• Pricing comparison');
  console.log('• Interactive fare calculator');
  console.log('• Referral banner');
  console.log('• Customer testimonials');
}

checkPorts();
