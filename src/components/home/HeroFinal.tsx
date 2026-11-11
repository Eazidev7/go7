import React from 'react';
import { Button } from '../ui/button';

const HeroFinal: React.FC = () => {
  return (
    <>
      {/* Image Preloading */}
      <link rel="preload" as="image" href="/assets/hero/burger-tall.png" />
      <link rel="preload" as="image" href="/assets/hero/go7-scooter.png" />
      <link rel="preload" as="image" href="/img/map-lines.svg" />

      <section 
        role="banner"
        aria-label="Go7 delivery hero"
        className="hero relative overflow-hidden"
        style={{
          background: 'var(--go7-red, #D92B2B)',
          isolation: 'isolate'
        }}
      >
        {/* Map overlay behind everything */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'url("/img/map-lines.svg")',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'contain',
            backgroundPosition: 'right bottom',
            opacity: 0.08,
            mixBlendMode: 'multiply',
            zIndex: 0,
            right: '4%',
            bottom: '6%',
            width: '820px',
            height: '512px',
            position: 'absolute',
            top: 'auto',
            left: 'auto'
          }}
        />

        {/* Main hero content container */}
        <div className="relative z-10 min-h-[580px] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop layout */}
          <div className="hidden lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center lg:min-h-[580px]">
            {/* Left column - Text content */}
            <div className="relative z-20">
              <div className="max-w-lg">
                <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
                  Your Favorite Food<br />
                  <span className="text-yellow-300">Delivered Fast</span>
                </h1>
                
                <p className="text-lg text-red-100 mb-8 leading-relaxed">
                  Craving something delicious? Get your favorite meals delivered in minutes. 
                  From local restaurants to quick bites – we've got you covered.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button variant="secondary" size="md">Order Now</Button>
                  <Button variant="ghost" size="md">View Menu</Button>
                </div>
              </div>
            </div>

            {/* Right column - Images */}
            <div className="relative h-full flex items-center justify-center">
              {/* Burger container */}
              <div className="relative z-30">
                <img
                  src="/assets/hero/burger-tall.png"
                  alt="Delicious burger"
                  className="w-auto h-96 object-contain"
                  style={{
                    animation: 'burgerBob 4s ease-in-out infinite',
                    filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.3))'
                  }}
                />
              </div>

              {/* Scooter positioned absolutely */}
              <div 
                className="absolute z-20"
                style={{
                  bottom: '20px',
                  right: '40px',
                  transform: 'translateX(10px)'
                }}
              >
                <img
                  src="/assets/hero/go7-scooter.png"
                  alt="GO7 delivery scooter"
                  className="w-auto h-32 object-contain"
                  style={{
                    animation: 'scooterNudge 6s ease-in-out infinite',
                    filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.2))'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Mobile layout */}
          <div className="lg:hidden flex flex-col min-h-[580px] py-12">
            {/* Mobile text content */}
            <div className="relative z-20 text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-6">
                Your Favorite Food<br />
                <span className="text-yellow-300">Delivered Fast</span>
              </h1>
              
              <p className="text-base sm:text-lg text-red-100 mb-8 leading-relaxed max-w-md mx-auto">
                Craving something delicious? Get your favorite meals delivered in minutes.
              </p>
              
              <div className="flex flex-col gap-4 max-w-sm mx-auto">
                <Button variant="secondary" size="md" fullWidth>Order Now</Button>
                <Button variant="ghost" size="md" fullWidth>View Menu</Button>
              </div>
            </div>

            {/* Mobile images */}
            <div className="relative flex-1 flex items-center justify-center">
              {/* Burger */}
              <div className="relative z-30">
                <img
                  src="/assets/hero/burger-tall.png"
                  alt="Delicious burger"
                  className="w-auto h-64 sm:h-80 object-contain"
                  style={{
                    animation: 'burgerBob 4s ease-in-out infinite',
                    filter: 'drop-shadow(0 15px 30px rgba(0,0,0,0.3))'
                  }}
                />
              </div>

              {/* Scooter */}
              <div 
                className="absolute z-20"
                style={{
                  bottom: '10px',
                  right: '20px'
                }}
              >
                <img
                  src="/assets/hero/go7-scooter.png"
                  alt="GO7 delivery scooter"
                  className="w-auto h-20 sm:h-24 object-contain"
                  style={{
                    animation: 'scooterNudge 6s ease-in-out infinite',
                    filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.2))'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Animations */}
        <style>{`
          @keyframes burgerBob {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-15px); }
          }
          
          @keyframes scooterNudge {
            0%, 100% { transform: translateX(0px); }
            25% { transform: translateX(8px); }
            75% { transform: translateX(-4px); }
          }
          
          @media (prefers-reduced-motion: reduce) {
            * {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
            }
          }
        `}</style>
      </section>
    </>
  );
};

export default HeroFinal;
