
import React, { useState, useRef } from 'react';
import { GenerationMode, AspectRatio, PresentationTemplate } from '../types';

interface InputBarProps {
    onSendMessage: (
        prompt: string, 
        mode: GenerationMode, 
        options: { 
            aspectRatio?: AspectRatio; 
            imageFile?: File; 
            presentationTemplate?: PresentationTemplate;
        }
    ) => void;
    isLoading: boolean;
}

const modes = Object.values(GenerationMode);

const InputBar: React.FC<InputBarProps> = ({ onSendMessage, isLoading }) => {
    const [prompt, setPrompt] = useState('');
    const [mode, setMode] = useState<GenerationMode>(GenerationMode.Chat);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [presentationTemplate, setPresentationTemplate] = useState<PresentationTemplate>('Professional');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const needsImageUpload = [
        GenerationMode.EditImage,
        GenerationMode.AnalyzeImage,
    ].includes(mode);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setImageFile(event.target.files[0]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() && !imageFile) return;

        if ((mode === GenerationMode.EditImage || mode === GenerationMode.AnalyzeImage) && !imageFile) {
            alert("Please upload an image for this mode.");
            return;
        }

        onSendMessage(prompt, mode, { 
            aspectRatio: (mode === GenerationMode.GenerateImage) ? aspectRatio : undefined, 
            imageFile: imageFile ?? undefined,
            presentationTemplate: mode === GenerationMode.GeneratePPT ? presentationTemplate : undefined,
        });
        setPrompt('');
        setImageFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleModeChange = (newMode: GenerationMode) => {
        setMode(newMode);
        setImageFile(null); // Reset file on mode change
    };

    return (
        <div className="bg-gray-800 p-4 border-t border-gray-700">
            {/* Mode Selector */}
            <div className="flex flex-wrap gap-2 mb-3">
                {modes.map(m => (
                    <button
                        key={m}
                        onClick={() => handleModeChange(m)}
                        className={`px-3 py-1 text-sm rounded-full transition-colors ${mode === m ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                    >
                        {m}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="flex gap-3">
                    {/* Main Prompt Input */}
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={
                            mode === GenerationMode.Chat ? "Ask anything..." :
                            mode === GenerationMode.GenerateImage ? "Describe the image to generate..." :
                            "Enter your instructions..."
                        }
                        rows={2}
                        className="flex-grow bg-gray-900 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none disabled:opacity-50"
                        disabled={isLoading}
                    />

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isLoading ? (
                           <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                           </svg>
                        ) : 'Send'}
                    </button>
                </div>
                
                {/* Mode-specific Options */}
                <div className="flex items-center gap-4">
                    {mode === GenerationMode.GenerateImage && (
                        <div>
                            <label htmlFor="aspectRatio" className="text-sm text-gray-400 mr-2">Aspect Ratio:</label>
                            <select
                                id="aspectRatio"
                                value={aspectRatio}
                                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                                className="bg-gray-700 rounded p-1 text-sm focus:ring-indigo-500 focus:outline-none"
                            >
                                <option value="1:1">1:1 (Square)</option>
                                <option value="16:9">16:9 (Widescreen)</option>
                                <option value="9:16">9:16 (Portrait)</option>
                                <option value="4:3">4:3 (Standard)</option>
                                <option value="3:4">3:4 (Tall)</option>
                            </select>
                        </div>
                    )}
                     {mode === GenerationMode.GeneratePPT && (
                        <div>
                            <label htmlFor="presentationTemplate" className="text-sm text-gray-400 mr-2">Template:</label>
                            <select
                                id="presentationTemplate"
                                value={presentationTemplate}
                                onChange={(e) => setPresentationTemplate(e.target.value as PresentationTemplate)}
                                className="bg-gray-700 rounded p-1 text-sm focus:ring-indigo-500 focus:outline-none"
                            >
                                <option value="Professional">Professional</option>
                                <option value="Creative">Creative</option>
                                <option value="Minimalist">Minimalist</option>
                            </select>
                        </div>
                    )}
                    {needsImageUpload && (
                        <div className="flex items-center gap-2">
                           <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-gray-700 hover:bg-gray-600 text-sm py-1 px-3 rounded"
                           >
                               {imageFile ? "Change Image" : "Upload Image"}
                           </button>
                           <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                           {imageFile && <span className="text-sm text-gray-400 truncate max-w-xs">{imageFile.name}</span>}
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
};

export default InputBar;