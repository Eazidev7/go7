import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const VendorRegistrationSuccess = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Registration Successful | Go7 Marketplace</title>
      </Helmet>

      <div className="max-w-md w-full">
        <div className="bg-white shadow-xl rounded-lg p-8 text-center">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-green-100 mb-6">
            <svg
              className="h-16 w-16 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          {/* Success Message */}
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
            Registration Successful!
          </h2>
          
          <p className="text-gray-600 mb-8">
            Thank you for registering with Go7 Marketplace. Your application is pending approval from our team.
          </p>

          {/* Info Box */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8 text-left">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  What happens next?
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Our team will review your application</li>
                    <li>We'll verify your business details</li>
                    <li>You'll receive an email within 24-48 hours</li>
                    <li>Once approved, you can start selling!</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Need help?</strong>
            </p>
            <p className="text-sm text-gray-600">
              Contact us at:{' '}
              <a
                href="mailto:vendors@go7delivery.com"
                className="text-red-600 hover:text-red-700 font-medium"
              >
                vendors@go7delivery.com
              </a>
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Call us:{' '}
              <a
                href="tel:+2348012345678"
                className="text-red-600 hover:text-red-700 font-medium"
              >
                +234 801 234 5678
              </a>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => navigate('/vendor/login')}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Go to Vendor Login
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-white text-gray-700 py-3 px-4 rounded-lg font-medium border-2 border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Return to Homepage
            </button>
          </div>

          {/* Additional Info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Your application reference number has been sent to your email address.
              Please keep it for future reference.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorRegistrationSuccess;
