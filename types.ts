
export enum Sender {
  User = 'user',
  AI = 'ai',
  System = 'system',
}

export enum GenerationMode {
  Chat = 'Chat',
  GenerateImage = 'Generate Image',
  EditImage = 'Edit Image',
  GenerateVideo = 'Generate Video',
  AnalyzeImage = 'Analyze Image',
  ComplexQuery = 'Complex Query',
  SearchWeb = 'Search Web',
  GeneratePPT = 'Generate Presentation',
}

export type PresentationTemplate = 'Professional' | 'Creative' | 'Minimalist';

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
  };
}

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  isLoading?: boolean;
  references?: GroundingChunk[];
  jsonContent?: any;
  presentationTemplate?: PresentationTemplate;
}

export interface ProjectVersion {
  id: string;
  name: string;
  timestamp: string;
  history: Message[];
}

export interface Project {
  id: string;
  name: string;
  history: Message[];
  category?: string;
  versions?: ProjectVersion[];
}

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
