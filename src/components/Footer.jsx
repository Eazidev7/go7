import React from 'react';
import { trackEvent } from '../utils/analytics';

function Footer() {
  const currentYear = new Date().getFullYear();

  const handleSocialClick = (platform) => {
    trackEvent('engagement', 'social_click', platform);
  };

  const handleWhatsAppClick = () => {
    trackEvent('engagement', 'whatsapp_click', 'footer');
  };

  const handleLinkClick = (category, linkName) => {
    trackEvent('navigation', 'footer_link_click', `${category}_${linkName}`);
  };
  
  return (
    <>
      {/* Trust Strip */}
      <div className="bg-gray-50 py-6 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center md:justify-between items-center gap-6 md:gap-8" role="list" aria-label="Our delivery guarantees">
            <div className="flex items-center gap-2" role="listitem">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="font-medium text-gray-800">1–3hr delivery</span>
            </div>
            
            <div className="h-8 border-r border-gray-300 hidden md:block" aria-hidden="true"></div>
            
            <div className="flex items-center gap-2" role="listitem">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="font-medium text-gray-800">Live tracking</span>
            </div>
            
            <div className="h-8 border-r border-gray-300 hidden md:block" aria-hidden="true"></div>
            
            <div className="flex items-center gap-2" role="listitem">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="font-medium text-gray-800">Verified riders</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Footer */}
      <footer id="contact" className="bg-gray-900 text-gray-300" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Column 1: Logo and Description */}
            <div>
              <div className="flex items-center mb-4">
                <div className="bg-white rounded-full p-1.5 mr-2">
                  <img className="h-8 w-auto" src="/go7-logo.png" alt="GO7 Delivery Service" />
                </div>
                <span className="text-white text-xl font-bold">GO7</span>
              </div>
              <p className="text-gray-400 text-sm mb-6">
                Fast, reliable delivery services for food, groceries, and packages. 
                We connect you with verified riders to get your items delivered quickly and safely.
              </p>
              
              {/* Social Icons */}
              <div className="flex space-x-4 mb-6" aria-label="Social media links">
                <a 
                  href="#" 
                  className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-white rounded-full"
                  onClick={() => handleSocialClick('facebook')}
                  aria-label="Visit our Facebook page"
                >
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
                <a 
                  href="#" 
                  className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-white rounded-full"
                  onClick={() => handleSocialClick('instagram')}
                  aria-label="Visit our Instagram page"
                >
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
                <a 
                  href="#" 
                  className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-white rounded-full"
                  onClick={() => handleSocialClick('twitter')}
                  aria-label="Visit our Twitter page"
                >
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a 
                  href="#" 
                  className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-white rounded-full"
                  onClick={() => handleSocialClick('youtube')}
                  aria-label="Visit our YouTube channel"
                >
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
              
              {/* WhatsApp Button */}
              <a 
                href="https://wa.me/2347000000000" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center bg-green-600 text-white font-medium py-3 px-5 rounded-xl hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                onClick={handleWhatsAppClick}
                aria-label="Contact us on WhatsApp"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
                WhatsApp Us
              </a>
            </div>
            
            {/* Column 2: Quick Links */}
            <nav aria-labelledby="footer-quick-links">
              <h3 id="footer-quick-links" className="text-white text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-3">
                <li>
                  <a 
                    href="/" 
                    className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:text-white"
                    onClick={() => handleLinkClick('quick', 'home')}
                  >
                    Home
                  </a>
                </li>
                <li>
                  <a 
                    href="/book" 
                    className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:text-white"
                    onClick={() => handleLinkClick('quick', 'book')}
                  >
                    Book a Delivery
                  </a>
                </li>
                <li>
                  <a 
                    href="/track" 
                    className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:text-white"
                    onClick={() => handleLinkClick('quick', 'track')}
                  >
                    Track Package
                  </a>
                </li>
                <li>
                  <a 
                    href="#services" 
                    className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:text-white"
                    onClick={() => handleLinkClick('quick', 'services')}
                  >
                    Our Services
                  </a>
                </li>
                <li>
                  <a 
                    href="#pricing" 
                    className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:text-white"
                    onClick={() => handleLinkClick('quick', 'pricing')}
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a 
                    href="#" 
                    className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:text-white"
                    onClick={() => handleLinkClick('quick', 'rider')}
                  >
                    Become a Rider
                  </a>
                </li>
              </ul>
            </nav>
            
            {/* Column 3: Company */}
            <nav aria-labelledby="footer-company">
              <h3 id="footer-company" className="text-white text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-3">
                <li>
                  <a 
                    href="#" 
                    className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:text-white"
                    onClick={() => handleLinkClick('company', 'about')}
                  >
                    About Us
                  </a>
                </li>
                <li>
                  <a 
                    href="#" 
                    className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:text-white"
                    onClick={() => handleLinkClick('company', 'press')}
                  >
                    Press
                  </a>
                </li>
                <li>
                  <a 
                    href="#" 
                    className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:text-white"
                    onClick={() => handleLinkClick('company', 'careers')}
                  >
                    Careers
                  </a>
                </li>
                <li>
                  <a 
                    href="#" 
                    className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:text-white"
                    onClick={() => handleLinkClick('company', 'contact')}
                  >
                    Contact Us
                  </a>
                </li>
                <li>
                  <a 
                    href="#" 
                    className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:text-white"
                    onClick={() => handleLinkClick('company', 'blog')}
                  >
                    Blog
                  </a>
                </li>
              </ul>
            </nav>
            
            {/* Column 4: Legal */}
            <nav aria-labelledby="footer-legal">
              <h3 id="footer-legal" className="text-white text-lg font-semibold mb-4">Legal</h3>
              <ul className="space-y-3">
                <li>
                  <a 
                    href="#" 
                    className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:text-white"
                    onClick={() => handleLinkClick('legal', 'terms')}
                  >
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a 
                    href="#" 
                    className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:text-white"
                    onClick={() => handleLinkClick('legal', 'privacy')}
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a 
                    href="#" 
                    className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:text-white"
                    onClick={() => handleLinkClick('legal', 'cookie')}
                  >
                    Cookie Policy
                  </a>
                </li>
                <li>
                  <a 
                    href="#" 
                    className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:text-white"
                    onClick={() => handleLinkClick('legal', 'faq')}
                  >
                    FAQ
                  </a>
                </li>
                <li>
                  <a 
                    href="#" 
                    className="text-gray-400 hover:text-white transition-colors focus:outline-none focus:text-white"
                    onClick={() => handleLinkClick('legal', 'support')}
                  >
                    Support
                  </a>
                </li>
              </ul>
            </nav>
          </div>
          
          {/* Bottom / Copyright */}
          <div className="mt-12 pt-8 border-t border-gray-800 text-center md:text-left md:flex md:justify-between md:items-center">
            <p className="text-sm text-gray-400">
              &copy; {currentYear} GO7 Delivery. All rights reserved.
            </p>
            <div className="mt-4 md:mt-0">
              <p className="text-xs text-gray-500">
                Made with ❤️ in Lagos, Nigeria
              </p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

export default Footer;
