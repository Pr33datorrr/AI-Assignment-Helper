
import React, { useState, useEffect, useCallback } from 'react';

interface ApiKeySelectorProps {
  children: React.ReactNode;
}

const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({ children }) => {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const checkApiKey = useCallback(async () => {
    if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
      setIsChecking(true);
      const keyStatus = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(keyStatus);
      setIsChecking(false);
    } else {
      // aistudio might not be available in all environments, assume key is set via env
      setHasApiKey(true);
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkApiKey();
  }, [checkApiKey]);

  const handleSelectKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      // Assume success and optimistically update UI to avoid race conditions
      setHasApiKey(true);
    }
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <p>Checking API Key status...</p>
      </div>
    );
  }

  if (!hasApiKey) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-8 text-center">
        <h1 className="text-3xl font-bold mb-4">API Key Required for Video Generation</h1>
        <p className="max-w-md mb-6">
          To use the Veo video generation features, you need to select an API key associated with a project that has billing enabled.
        </p>
        <button
          onClick={handleSelectKey}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          Select API Key
        </button>
        <a
          href="https://ai.google.dev/gemini-api/docs/billing"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 text-indigo-400 hover:text-indigo-300"
        >
          Learn more about billing
        </a>
      </div>
    );
  }

  return <>{children}</>;
};

export default ApiKeySelector;
