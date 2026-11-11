import React from 'react';
import { Link } from 'react-router-dom';

const QuickAction = ({ icon, title, route }) => {
  return (
    <Link to={route} className="rounded-lg shadow-sm bg-white border border-gray-100 p-3 flex items-center">
      <div className="text-go7-red mr-3 text-xl">{icon}</div>
      <span className="font-bold text-sm text-gray-800">{title}</span>
    </Link>
  );
};

export default QuickAction;