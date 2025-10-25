
import React, { useState, useEffect, useRef } from 'react';
import { Project, Message, Sender, GenerationMode, AspectRatio, GroundingChunk, PresentationTemplate, ProjectVersion } from '../types';
import MessageComponent from './Message';
import InputBar from './InputBar';
import * as geminiService from '../services/geminiService';

interface ChatViewProps {
    project: Project;
    onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
}

const getFriendlyErrorMessage = (error: any): string => {
    const errorMessage = error.message || String(error);
    console.error("API Call Failed:", error); // Keep detailed log for developers

    if (errorMessage.includes('API key not valid')) {
        return "Authentication Error: The API key is invalid. Please check your setup.";
    }
    if (errorMessage.includes('429') || /rate limit/i.test(errorMessage)) {
        return "Rate Limit Exceeded: You've sent too many requests in a short period. Please wait and try again later.";
    }
    if (/safety/i.test(errorMessage) || /blocked/i.test(errorMessage)) {
        return "Content Safety: The request was blocked due to safety settings. Please adjust your prompt.";
    }
    if (error instanceof SyntaxError) {
        return "Invalid Response: The AI returned a malformed response. This might be a temporary issue. Please try again.";
    }
    if (errorMessage.includes("Requested entity was not found.")) {
        return "API Key Error: The selected API key may not have the necessary permissions or billing enabled for this model. Please select a different key.";
    }

    // Fallback for generic errors
    return `An unexpected error occurred: ${errorMessage}`;
};


const ChatView: React.FC<ChatViewProps> = ({ project, onUpdateProject }) => {
    const [messages, setMessages] = useState<Message[]>(project.history);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMessages(project.history);
    }, [project]);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    const updateHistory = (newHistory: Message[]) => {
        onUpdateProject(project.id, { history: newHistory });
    };

    const handleSaveVersion = () => {
        const versionName = prompt("Enter a name for this version:", `Version ${(project.versions?.length || 0) + 1}`);
        if (!versionName) return;

        const newVersion: ProjectVersion = {
            id: `v-${Date.now()}`,
            name: versionName,
            timestamp: new Date().toISOString(),
            history: [...messages.filter(m => !m.isLoading)], // Save a snapshot of current history
        };

        const updatedVersions = [...(project.versions || []), newVersion];
        onUpdateProject(project.id, { versions: updatedVersions });
        alert(`Version "${versionName}" saved!`);
    };
    
    const handleReaction = (messageId: string, reaction: 'like' | 'dislike') => {
        const newHistory = messages.map(m => {
            if (m.id === messageId) {
                // Toggle reaction off if the same one is clicked again
                return { ...m, reaction: m.reaction === reaction ? undefined : reaction };
            }
            return m;
        });
        setMessages(newHistory);
        updateHistory(newHistory);
    };

    const handleSendMessage = async (
        prompt: string,
        mode: GenerationMode,
        options: { aspectRatio?: AspectRatio; imageFile?: File; presentationTemplate?: PresentationTemplate, useWebSearch?: boolean }
    ) => {
        setIsLoading(true);

        const userMessageText = options.imageFile ? `${prompt} (with uploaded image)` : prompt;

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            sender: Sender.User,
            text: userMessageText,
        };

        const loadingMsg: Message = {
            id: `ai-${Date.now()}`,
            sender: Sender.AI,
            text: 'Thinking...',
            isLoading: true,
        };

        const historyForApi = [...messages, userMessage];
        setMessages(prevMessages => [...prevMessages, userMessage, loadingMsg]);

        try {
            let aiResponse: Partial<Message> = { text: '' };
            const useWebSearch = options.useWebSearch || false;

            switch (mode) {
                case GenerationMode.GenerateImage:
                    aiResponse.imageUrl = await geminiService.generateImage(prompt, options.aspectRatio || '1:1');
                    aiResponse.text = "Here is the image you requested.";
                    break;
                case GenerationMode.EditImage:
                    aiResponse.imageUrl = await geminiService.editImage(prompt, options.imageFile!);
                    aiResponse.text = "Here is the edited image.";
                    break;
                case GenerationMode.AnalyzeImage:
                    aiResponse.text = await geminiService.analyzeImage(prompt, options.imageFile!);
                    break;
                case GenerationMode.ComplexQuery:
                    const complexResponse = await geminiService.runComplexQuery(prompt, useWebSearch);
                    aiResponse.text = complexResponse.text;
                    aiResponse.references = complexResponse.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[];
                    break;
                case GenerationMode.GeneratePPT:
                    aiResponse.jsonContent = await geminiService.generatePresentation(prompt, options.presentationTemplate!, useWebSearch);
                    aiResponse.text = "Here's the presentation outline I've generated for you.";
                    aiResponse.presentationTemplate = options.presentationTemplate;
                    break;
                case GenerationMode.Chat:
                default:
                    const historyForChat = historyForApi
                      .filter(m => !m.isLoading && m.text)
                      .map(m => ({
                        role: m.sender === Sender.User ? 'user' : 'model',
                        parts: [{ text: m.text }],
                      }));
                    const chatResponse = await geminiService.runChat(historyForChat, prompt, useWebSearch);
                    aiResponse.text = chatResponse.text;
                    aiResponse.references = chatResponse.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[];
                    break;
            }
            
            const finalHistory = [...historyForApi, { ...loadingMsg, ...aiResponse, isLoading: false }];
            setMessages(finalHistory);
            updateHistory(finalHistory);

        } catch (error: any) {
            const friendlyErrorText = getFriendlyErrorMessage(error);
            const errorHistory = [...historyForApi, { ...loadingMsg, text: friendlyErrorText, isLoading: false }];
            setMessages(errorHistory);
            updateHistory(errorHistory);
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="flex flex-col h-full bg-gray-900">
            <header className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
                <h1 className="text-xl font-bold">{project.name}</h1>
                <button
                    onClick={handleSaveVersion}
                    className="bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold py-1 px-3 rounded-lg transition-colors"
                    >
                    Save Version
                </button>
            </header>
            <main className="flex-1 overflow-y-auto p-4">
                 {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <svg className="w-24 h-24 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                        <h2 className="text-2xl font-semibold">Assignment Assistant</h2>
                        <p className="mt-2">Start a conversation with your AI assistant.</p>
                    </div>
                )}
                {messages.map((msg) => (
                    <MessageComponent key={msg.id} message={msg} onReaction={handleReaction} />
                ))}
                <div ref={messagesEndRef} />
            </main>
            <InputBar onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
    );
};

export default ChatView;