import { NavLink } from "react-router-dom";
import { Home, Package, MapPin, MessageCircle, User } from "lucide-react";
import "./MobileNavBar.css";

export default function MobileNavBar() {
  return (
    <nav className="go7-bottom-nav" role="navigation" aria-label="Main navigation">
      <NavLink 
        to="/" 
        end
        className="nav-item"
        aria-label="Explore Go7"
      >
        <Home size={22} strokeWidth={2.5} aria-hidden="true" />
        <span>Explore Go7</span>
      </NavLink>
      
      <NavLink 
        to="/orders" 
        className="nav-item"
        aria-label="Your orders"
      >
        <Package size={22} strokeWidth={2.5} aria-hidden="true" />
        <span>Orders</span>
      </NavLink>
      
      <NavLink 
        to="/track" 
        className="nav-item"
        aria-label="Track delivery"
      >
        <MapPin size={22} strokeWidth={2.5} aria-hidden="true" />
        <span>Track</span>
      </NavLink>
      
      <NavLink 
        to="/chat" 
        className="nav-item"
        aria-label="Chat support"
      >
        <MessageCircle size={22} strokeWidth={2.5} aria-hidden="true" />
        <span>Chat</span>
      </NavLink>
      
      <NavLink 
        to="/profile" 
        className="nav-item"
        aria-label="Your profile"
      >
        <User size={22} strokeWidth={2.5} aria-hidden="true" />
        <span>Profile</span>
      </NavLink>
    </nav>
  );
}
