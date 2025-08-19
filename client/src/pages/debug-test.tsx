import React from 'react';

export default function DebugTest() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-green-100">
      <div className="text-center p-8">
        <h1 className="text-4xl font-bold text-green-600 mb-4">✅ DEBUG TEST PAGE</h1>
        <p className="text-gray-800 text-xl mb-4">This page loads correctly!</p>
        <p className="text-gray-600">URL: {window.location.href}</p>
        <p className="text-gray-600">Path: {window.location.pathname}</p>
        <button 
          onClick={() => console.log('Button clicked!')} 
          className="bg-green-500 text-white px-6 py-3 rounded-lg mt-4 text-lg"
        >
          Test Console Log
        </button>
      </div>
    </div>
  );
}