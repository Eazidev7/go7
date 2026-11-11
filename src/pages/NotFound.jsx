import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-gray-400 mb-4">404</h1>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Page Not Found</h2>
            <p className="text-gray-600 mb-8">
              Sorry, the page you are looking for doesn't exist.
            </p>
            <Link
              to="/"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              Go Back Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;