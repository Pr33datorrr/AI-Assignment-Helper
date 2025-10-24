
import { useState, useEffect, useCallback } from 'react';
import { generateVideo, checkVideoStatus } from '../services/geminiService';

type VideoStatus = 'idle' | 'generating' | 'success' | 'error';

export const useVeo = () => {
    const [status, setStatus] = useState<VideoStatus>('idle');
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const startGeneration = useCallback(async (prompt: string, aspectRatio: '16:9' | '9:16', imageFile?: File) => {
        setStatus('generating');
        setVideoUrl(null);
        setError(null);

        try {
            const initialOperation = await generateVideo(prompt, aspectRatio, imageFile);
            
            const poll = async (operation: any) => {
                const updatedOperation = await checkVideoStatus(operation);

                if (updatedOperation.done) {
                    const downloadLink = updatedOperation.response?.generatedVideos?.[0]?.video?.uri;
                    if (downloadLink && process.env.API_KEY) {
                        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                        const blob = await response.blob();
                        const objectURL = URL.createObjectURL(blob);
                        setVideoUrl(objectURL);
                        setStatus('success');
                    } else {
                        throw new Error('Video generation finished, but no download link was provided.');
                    }
                } else {
                    setTimeout(() => poll(updatedOperation), 10000); // Poll every 10 seconds
                }
            };
            
            await poll(initialOperation);

        } catch (err: any) {
            console.error("VEO Generation Error:", err);
            if (err.message.includes("Requested entity was not found.")) {
                 setError("API Key error. Please re-select your API key and try again.");
            } else {
                 setError(err.message || 'An unknown error occurred during video generation.');
            }
            setStatus('error');
        }
    }, []);

    return { status, videoUrl, error, startGeneration };
};
