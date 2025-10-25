import { GoogleGenAI, GenerateContentResponse, Type, Modality } from "@google/genai";
import { fileToBase64 } from '../utils/fileUtils';
import { AspectRatio, GroundingChunk, PresentationTemplate } from '../types';

// FIX: Removed duplicate global declaration for window.aistudio to resolve type conflict.
// It is assumed to be declared elsewhere in the project's global scope.

const getApiKey = (): string => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }
    return process.env.API_KEY;
};

const createGenAI = () => new GoogleGenAI({ apiKey: getApiKey() });

interface ImagePart {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

const fileToImagePart = async (file: File): Promise<ImagePart> => {
  const base64Data = await fileToBase64(file);
  return {
    inlineData: {
      mimeType: file.type,
      data: base64Data,
    },
  };
};

export const runChat = async (history: { role: string, parts: { text: string }[] }[], prompt: string, useWebSearch: boolean) => {
  const ai = createGenAI();
  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    history: history,
    config: {
        tools: useWebSearch ? [{ googleSearch: {} }] : [],
    }
  });
  const response = await chat.sendMessage({ message: prompt });
  return response;
};

export const runFastChat = async (prompt: string) => {
  const ai = createGenAI();
  const response = await ai.models.generateContent({
    model: 'gemini-flash-lite-latest',
    contents: prompt,
  });
  return response;
}

export const generateImage = async (prompt: string, aspectRatio: AspectRatio): Promise<string> => {
  const ai = createGenAI();
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio,
    },
  });

  const base64ImageBytes = response.generatedImages[0].image.imageBytes;
  return `data:image/jpeg;base64,${base64ImageBytes}`;
};

export const editImage = async (prompt: string, imageFile: File): Promise<string> => {
  const ai = createGenAI();
  const imagePart = await fileToImagePart(imageFile);
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [imagePart, { text: prompt }],
    },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });
  
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      const base64ImageBytes: string = part.inlineData.data;
      return `data:image/png;base64,${base64ImageBytes}`;
    }
  }
  throw new Error("No image generated");
};


export const analyzeImage = async (prompt: string, imageFile: File): Promise<string> => {
  const ai = createGenAI();
  const imagePart = await fileToImagePart(imageFile);
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, { text: prompt }] },
  });
  return response.text;
};

export const runComplexQuery = async (prompt: string, useWebSearch: boolean): Promise<GenerateContentResponse> => {
  const ai = createGenAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      thinkingConfig: { thinkingBudget: 32768 },
      tools: useWebSearch ? [{ googleSearch: {} }] : [],
    },
  });
  return response;
};

export const searchWeb = async (prompt: string): Promise<{ text: string, references: GroundingChunk[] }> => {
  const ai = createGenAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });
  // FIX: Manually transform the API's GroundingChunk to our local, stricter GroundingChunk type.
  // The API may return chunks with optional `uri` or `title`, which is incompatible with our local type.
  // This ensures that any grounding chunk we use in the app has the required `uri` and `title` properties.
  const apiChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const references: GroundingChunk[] = [];
  for (const chunk of apiChunks) {
    const newChunk: GroundingChunk = {};
    if (chunk.web?.uri && chunk.web.title) {
      newChunk.web = { uri: chunk.web.uri, title: chunk.web.title };
    }
    if (chunk.maps?.uri && chunk.maps.title) {
      newChunk.maps = { uri: chunk.maps.uri, title: chunk.maps.title };
    }
    if (newChunk.web || newChunk.maps) {
      references.push(newChunk);
    }
  }
  return { text: response.text, references };
};

export const generatePresentation = async (prompt: string, template: PresentationTemplate, useWebSearch: boolean): Promise<any> => {
    const ai = createGenAI();
    
    const isJsonSchemaAllowed = !useWebSearch;

    const presentationPrompt = `Based on the following topic, create a presentation structure. The presentation should have a '${template}' style (e.g., tone, slide structure). 
    Your response MUST be a single, valid JSON object that follows this exact structure:
    {
      "presentationTitle": "string",
      "slides": [
        {
          "slideTitle": "string",
          "content": ["string", "..."],
          "imagePrompt": "A descriptive, detailed prompt for an AI image generator to create a relevant, visually appealing image for this specific slide."
        },
        ...
      ]
    }
    Topic: ${prompt}`;

    const config: any = {
        maxOutputTokens: 8192,
    };

    if (isJsonSchemaAllowed) {
        config.responseMimeType = "application/json";
        config.responseSchema = {
            type: Type.OBJECT,
            properties: {
                presentationTitle: { type: Type.STRING },
                slides: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            slideTitle: { type: Type.STRING },
                            content: { type: Type.ARRAY, items: { type: Type.STRING } },
                            imagePrompt: { type: Type.STRING, description: "A descriptive prompt for an AI image generator." }
                        },
                        required: ["slideTitle", "content", "imagePrompt"]
                    }
                }
            }
        };
    } else {
        config.tools = [{ googleSearch: {} }];
    }

    // Stage 1: Generate presentation structure with image prompts
    const structureResponse = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: isJsonSchemaAllowed ? `Based on the following topic, create a presentation structure with a title and a list of slides. Each slide must have a title, a list of bullet points for its content, and an "imagePrompt". The imagePrompt should be a descriptive, detailed prompt for an AI image generator to create a relevant, visually appealing image for that specific slide. The presentation should have a '${template}' style (e.g., tone, slide structure). Topic: ${prompt}` : presentationPrompt,
        config: config
    });

    // FIX: Sanitize the response to remove Markdown code blocks before parsing.
    // The model sometimes wraps the JSON in ` ```json ... ``` ` which causes parsing to fail.
    let responseText = structureResponse.text.trim();
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = responseText.match(jsonRegex);
    if (match && match[1]) {
        responseText = match[1];
    }
    
    const presentationData = JSON.parse(responseText);

    if (!presentationData.slides || presentationData.slides.length === 0) {
        return presentationData;
    }
    
    // Stage 2: Generate images for each slide concurrently
    const imageGenerationPromises = presentationData.slides.map((slide: any) => {
        if (slide.imagePrompt) {
            return generateImage(slide.imagePrompt, '16:9')
                .then(imageUrl => ({ ...slide, imageUrl }))
                .catch(error => {
                    console.error(`Failed to generate image for slide: "${slide.slideTitle}"`, error);
                    return { ...slide, imageUrl: null };
                });
        }
        return Promise.resolve({ ...slide, imageUrl: null });
    });

    presentationData.slides = await Promise.all(imageGenerationPromises);

    return presentationData;
};


// FIX: Add generateVideo and checkVideoStatus functions to support Veo video generation.
// These functions were missing, causing import errors in useVeo.ts.
export const generateVideo = async (prompt: string, aspectRatio: '16:9' | '9:16', imageFile?: File) => {
    const ai = createGenAI();

    const payload: any = {
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        config: {
            numberOfVideos: 1,
            resolution: '1080p',
            aspectRatio,
        }
    };

    if (imageFile) {
        const base64Data = await fileToBase64(imageFile);
        payload.image = {
            imageBytes: base64Data,
            mimeType: imageFile.type
        };
    }
    
    const operation = await ai.models.generateVideos(payload);
    return operation;
};

export const checkVideoStatus = async (operation: any) => {
    const ai = createGenAI();
    const updatedOperation = await ai.operations.getVideosOperation({ operation });
    return updatedOperation;
};