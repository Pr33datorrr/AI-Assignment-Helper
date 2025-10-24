
import React, { useState, useEffect, useRef } from 'react';
import { Project, Message, Sender, GenerationMode, AspectRatio, GroundingChunk, PresentationTemplate, ProjectVersion } from '../types';
import MessageComponent from './Message';
import InputBar from './InputBar';
import * as geminiService from '../services/geminiService';

interface ChatViewProps {
    project: Project;
    onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
}

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

    const addMessage = (message: Omit<Message, 'id'>) => {
        const newMessage = { ...message, id: `${message.sender}-${Date.now()}` };
        const updatedHistory = [...messages, newMessage];
        setMessages(updatedHistory);
        updateHistory(updatedHistory);
        return newMessage;
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

    const handleSendMessage = async (
        prompt: string,
        mode: GenerationMode,
        options: { aspectRatio?: AspectRatio; imageFile?: File; presentationTemplate?: PresentationTemplate }
    ) => {
        setIsLoading(true);

        const userMessageText = options.imageFile ? `${prompt} (with uploaded image)` : prompt;
        addMessage({ sender: Sender.User, text: userMessageText });

        const loadingMsg = addMessage({ sender: Sender.AI, text: 'Thinking...', isLoading: true });

        try {
            let aiResponse: Partial<Message> = { text: '' };

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
                    aiResponse.text = await geminiService.runComplexQuery(prompt);
                    break;
                case GenerationMode.SearchWeb:
                    const searchResult = await geminiService.searchWeb(prompt);
                    aiResponse.text = searchResult.text;
                    aiResponse.references = searchResult.references;
                    break;
                case GenerationMode.GeneratePPT:
                    aiResponse.jsonContent = await geminiService.generatePresentation(prompt, options.presentationTemplate!);
                    aiResponse.text = "Here's the presentation outline I've generated for you.";
                    aiResponse.presentationTemplate = options.presentationTemplate;
                    break;
                case GenerationMode.Chat:
                default:
                    const historyForChat = messages
                      .filter(m => !m.isLoading && m.text)
                      .map(m => ({
                        role: m.sender === Sender.User ? 'user' : 'model',
                        parts: [{ text: m.text }],
                      }));
                    const chatResponse = await geminiService.runChat(historyForChat, prompt);
                    aiResponse.text = chatResponse.text;
                    break;
            }
            
            const finalHistory = messages.map(m => m.id === loadingMsg.id ? { ...m, ...aiResponse, isLoading: false, id: loadingMsg.id } : m);
            setMessages(finalHistory);
            updateHistory(finalHistory);

        } catch (error: any) {
            const errorText = `An error occurred: ${error.message}`;
            const errorHistory = messages.map(m => m.id === loadingMsg.id ? { ...m, text: errorText, isLoading: false, id: loadingMsg.id } : m);
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
                    <MessageComponent key={msg.id} message={msg} />
                ))}
                <div ref={messagesEndRef} />
            </main>
            <InputBar onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
    );
};

export default ChatView;