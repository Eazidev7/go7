import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { trackEvent } from '../utils/analytics';
import { useAuth } from '../contexts/AuthContext.tsx';
import '../styles/auth-nav.css';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated, login, logout } = useAuth();

  // Handle scroll event to add shadow
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 8) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Toggle mobile menu
  const toggleMenu = () => {
    const newMenuState = !isMenuOpen;
    setIsMenuOpen(newMenuState);

    // Update hamburger menu classes
    const hamburgerElement = document.querySelector('.hamburger-menu');
    if (hamburgerElement) {
      if (newMenuState) {
        hamburgerElement.classList.add('open');
      } else {
        hamburgerElement.classList.remove('open');
      }
    }

    // Update mobile menu aria-expanded
    const menuButton = document.querySelector('[aria-controls="mobile-menu"]');
    if (menuButton) {
      menuButton.setAttribute('aria-expanded', newMenuState.toString());
    }
  };

  // Demo authentication functions (replace with real auth logic)
  const handleLogin = () => {
    // Demo login - cycle through roles for testing
    const roles = ['customer', 'rider', 'vendor', 'admin'];
    const currentRoleIndex = user ? roles.indexOf(user.role) : -1;
    const nextRole = roles[(currentRoleIndex + 1) % roles.length];

    login({
      id: `demo-${nextRole}`,
      name: `Demo ${nextRole.charAt(0).toUpperCase() + nextRole.slice(1)}`,
      email: `${nextRole}@go7.com`,
      role: nextRole
    });

    // Close mobile menu after login
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
  };

  // Close mobile menu on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isMenuOpen]);

  // Track navigation events and handle smooth scrolling
  const handleNavClick = (navItem) => {
    trackEvent('navigation', 'navbar_click', navItem);
    setIsMenuOpen(false);

    // Handle smooth scrolling for hash links
    const navLink = navLinks.find(link => link.id === navItem);
    if (navLink && navLink.href.startsWith('#')) {
      const targetId = navLink.href.substring(1); // Remove the # symbol
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }
  };

  // Check if a route is active
  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return path.startsWith('#')
      ? location.hash === path
      : location.pathname === path;
  };

  // Define navigation links
  const navLinks = [
    { text: 'Home', href: '/', id: 'home' },
    { text: 'Services', href: '#services', id: 'services' },
    { text: 'GoBuy', href: '/gobuy', id: 'gobuy' },
    { text: 'Vendors', href: '/vendor/register', id: 'vendor_register' },
    { text: 'Track', href: '/track', id: 'track' },
    { text: 'Contact', href: '#contact', id: 'contact' }
  ];

  return (
    <nav
      aria-label="Primary"
      className={`sticky top-0 z-50 w-full bg-[#E53935]/80 text-white transition-all duration-300 ${scrolled ? 'shadow-[0_6px_20px_rgba(0,0,0,0.15)]' : ''
        }`}
      style={{
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--go7-border)'
      }}
    >
      <div className="max-w-[1220px] mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center" onClick={() => handleNavClick('logo')}>
              <div className="bg-white rounded-lg p-2 shadow-sm">
                <img
                  className="h-8"
                  src="/go7-logo.png"
                  alt="GO7"
                />
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex justify-center flex-1 px-4">
            <div className="flex space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.id}
                  to={link.href}
                  className={`font-semibold hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-white/60 rounded px-2 py-1 ${isActive(link.href) ? 'border-b-2 border-white' : ''
                    }`}
                  onClick={() => handleNavClick(link.id)}
                >
                  {link.text}
                </Link>
              ))}
            </div>
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Public links - always visible */}
            <Link
              to="/book"
              className="inline-flex h-10 px-4 items-center justify-center rounded-xl bg-white text-black font-extrabold hover:-translate-y-0.5 hover:shadow transition"
              onClick={() => handleNavClick('desktop_book')}
            >
              Book a Delivery
            </Link>
            <Link
              to="/gobuy"
              className="inline-flex h-10 px-4 items-center justify-center rounded-xl bg-purple-600 text-white font-extrabold hover:-translate-y-0.5 hover:shadow transition"
              onClick={() => handleNavClick('desktop_gobuy')}
            >
              🛍️ GoBuy
            </Link>
            <Link
              to="/track"
              className="inline-flex h-10 px-4 items-center justify-center rounded-xl border-2 border-white text-white font-extrabold hover:bg-white hover:text-black transition"
              onClick={() => handleNavClick('desktop_track')}
            >
              Track Package
            </Link>

            {/* Vendor Links - Desktop Only */}
            <Link
              to="/vendor/register"
              className="inline-flex h-10 px-4 items-center justify-center rounded-xl bg-orange-500 text-white font-extrabold hover:bg-orange-600 hover:-translate-y-0.5 hover:shadow transition"
              onClick={() => handleNavClick('vendor_register')}
            >
              🏪 Become a Vendor
            </Link>
            <a
              href="/vendor/login"
              className="inline-flex h-10 px-4 items-center justify-center rounded-xl border-2 border-orange-400 text-white font-extrabold hover:bg-orange-400 transition"
              onClick={() => handleNavClick('vendor_login')}
            >
              Vendor Login
            </a>

            {/* Authentication buttons */}
            {!isAuthenticated ? (
              <button
                onClick={handleLogin}
                className="go7-auth login"
                type="button"
              >
                Login
              </button>
            ) : (
              <>
                <div className="go7-auth user-profile">
                  <span>{user?.name}</span>
                  <span className="user-role">{user?.role}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="go7-auth logout"
                  type="button"
                >
                  Logout
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              type="button"
              className="hamburger-menu inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
              aria-controls="mobile-menu"
              aria-expanded={isMenuOpen}
              onClick={toggleMenu}
            >
              <span className="sr-only">{isMenuOpen ? 'Close main menu' : 'Open main menu'}</span>
              {!isMenuOpen ? (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        className="mobile-menu md:hidden overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: isMenuOpen ? '500px' : '0px' }}
      >
        <div className="px-4 pt-2 pb-4 space-y-1 border-t border-white/20">
          {navLinks.map((link) => (
            <Link
              key={link.id}
              to={link.href}
              className={`nav-link block py-2 px-3 font-semibold rounded-md hover:bg-white/10 ${isActive(link.href) ? 'active bg-white/10' : ''
                }`}
              onClick={() => handleNavClick(`mobile_${link.id}`)}
            >
              {link.text}
            </Link>
          ))}

          <div className="pt-4 pb-2 space-y-3">
            {/* Public action buttons */}
            <Link
              to="/book"
              className="block w-full text-center py-3 rounded-xl bg-white text-black font-extrabold hover:shadow transition"
              onClick={() => handleNavClick('mobile_book')}
            >
              Book a Delivery
            </Link>
            <Link
              to="/track"
              className="block w-full text-center py-3 rounded-xl border-2 border-white text-white font-extrabold hover:bg-white hover:text-black transition"
              onClick={() => handleNavClick('mobile_track')}
            >
              Track Package
            </Link>

            {/* Vendor Links - Mobile */}
            <Link
              to="/vendor/register"
              className="block w-full text-center py-3 rounded-xl bg-orange-500 text-white font-extrabold hover:bg-orange-600 transition"
              onClick={() => handleNavClick('mobile_vendor_register')}
            >
              🏪 Become a Vendor
            </Link>
            <a
              href="/vendor/login"
              className="block w-full text-center py-3 rounded-xl border-2 border-orange-400 text-white font-extrabold hover:bg-orange-400 transition"
              onClick={() => handleNavClick('mobile_vendor_login')}
            >
              Vendor Login
            </a>

            {/* Authentication section */}
            <div className="pt-2 border-t border-white/20">
              {!isAuthenticated ? (
                <button
                  onClick={handleLogin}
                  className="go7-auth login"
                  type="button"
                >
                  Login to Go7
                </button>
              ) : (
                <>
                  <div className="go7-auth user-profile mb-3">
                    <span>{user?.name}</span>
                    <span className="user-role">{user?.role}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="go7-auth logout"
                    type="button"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
