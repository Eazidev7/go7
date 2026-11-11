import React, { useState } from 'react';
import { generateTestData, clearTestData } from '../utils/testDataGenerator';
import Swal from 'sweetalert2';

const TestDataPanel = () => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

    const handleGenerateData = async () => {
        setIsGenerating(true);
        try {
            const result = await generateTestData();
            Swal.fire({
                title: 'Success!',
                text: 'Test data has been generated successfully!',
                icon: 'success',
                confirmButtonText: 'OK'
            });
            console.log('Generated:', result);
        } catch (error) {
            Swal.fire({
                title: 'Error!',
                text: 'Failed to generate test data. Please check the console.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
            console.error('Error:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleClearData = async () => {
        const result = await Swal.fire({
            title: 'Clear Test Data?',
            text: 'This will remove all test data from the database.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, clear it!',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            setIsClearing(true);
            try {
                await clearTestData();
                Swal.fire({
                    title: 'Cleared!',
                    text: 'Test data has been cleared.',
                    icon: 'success'
                });
            } catch (error) {
                Swal.fire({
                    title: 'Error!',
                    text: 'Failed to clear test data.',
                    icon: 'error'
                });
            } finally {
                setIsClearing(false);
            }
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Go7 Test Data Generator</h2>
            <p className="text-gray-600 mb-6">
                Generate sample data for testing the Admin Dashboard including riders, orders, vendors, and payments.
            </p>
            
            <div className="space-y-4">
                <button
                    onClick={handleGenerateData}
                    disabled={isGenerating}
                    className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    {isGenerating ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Generating Data...
                        </>
                    ) : (
                        '🎲 Generate Test Data'
                    )}
                </button>

                <button
                    onClick={handleClearData}
                    disabled={isClearing}
                    className="w-full py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    {isClearing ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Clearing Data...
                        </>
                    ) : (
                        '🧹 Clear Test Data'
                    )}
                </button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">What gets generated:</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                    <li>• 3 Sample riders with different statuses</li>
                    <li>• 3 Sample vendors (Restaurant, Grocery, Electronics)</li>
                    <li>• 3 Sample orders with different statuses</li>
                    <li>• 2 Sample payment records</li>
                    <li>• Real location data for Abeokuta area</li>
                </ul>
            </div>
        </div>
    );
};

export default TestDataPanel;