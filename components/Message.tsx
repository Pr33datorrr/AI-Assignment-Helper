import React, { useState, useRef } from 'react';
import { Message as MessageType, Sender, PresentationTemplate } from '../types';
import { marked } from 'marked';
import JSZip from 'jszip';
import html2canvas from 'html2canvas';


interface MessageProps {
  message: MessageType;
  onReaction: (messageId: string, reaction: 'like' | 'dislike') => void;
}

const UserIcon = () => (
    <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
);

const AiIcon = () => (
    <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
);

const LoadingSpinner: React.FC = () => (
  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

const templateStyles = {
    Professional: {
        containerBorder: 'border-blue-700',
        headerText: 'text-blue-300',
        slideBg: 'bg-slate-800',
        slideTitle: 'text-cyan-300',
        slideContent: 'text-slate-200',
        navButton: 'bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900',
    },
    Creative: {
        containerBorder: 'border-purple-700',
        headerText: 'text-purple-300',
        slideBg: 'bg-gradient-to-br from-indigo-900 to-purple-900',
        slideTitle: 'text-pink-300',
        slideContent: 'text-purple-200',
        navButton: 'bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900',
    },
    Minimalist: {
        containerBorder: 'border-gray-600',
        headerText: 'text-gray-200',
        slideBg: 'bg-gray-700',
        slideTitle: 'text-gray-100',
        slideContent: 'text-gray-300',
        navButton: 'bg-gray-600 hover:bg-gray-500 disabled:bg-gray-800',
    }
};

const SlideExporter: React.FC<{ slide: any, template: PresentationTemplate, styles: any }> = ({ slide, styles }) => {
    const hasContent = Array.isArray(slide.content) && slide.content.length > 0;
    return (
        <div className={`aspect-video w-[1280px] h-[720px] ${styles.slideBg} p-12 flex flex-col shadow-lg`}>
            <h4 className={`text-5xl font-bold mb-8 text-center ${styles.slideTitle}`}>{slide.slideTitle}</h4>
            <div className="flex-grow flex items-stretch justify-center gap-8 min-h-0">
                {slide.imageUrl && (
                    <div className={`flex items-center justify-center ${hasContent ? 'w-1/2' : 'w-full'}`}>
                        <img src={slide.imageUrl} alt={slide.slideTitle} className="max-w-full max-h-full object-contain" />
                    </div>
                )}
                {hasContent && (
                    <div className={`flex items-center ${slide.imageUrl ? 'w-1/2' : 'w-full'}`}>
                         <ul className={`list-disc pl-10 text-3xl space-y-4 ${styles.slideContent}`}>
                            {slide.content.map((point: string, pIndex: number) => (
                                <li key={pIndex}>{point}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

const PresentationCard: React.FC<{ data: any, template: PresentationTemplate }> = ({ data, template }) => {
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [isDownloading, setIsDownloading] = useState(false);
    const exportContainerRef = useRef<HTMLDivElement>(null);
    const styles = templateStyles[template] || templateStyles.Professional;

    if (!data || !Array.isArray(data.slides) || data.slides.length === 0) {
        return <div className="bg-gray-800 p-4 rounded-lg border border-red-700 mt-2"><p className="text-red-400">Error: Presentation data is missing, empty, or malformed.</p></div>;
    }
    
    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const zip = new JSZip();
            const slideElements = exportContainerRef.current?.children;
            if (!slideElements) return;

            for (let i = 0; i < slideElements.length; i++) {
                const element = slideElements[i] as HTMLElement;
                const canvas = await html2canvas(element, { scale: 1 });
                const slideImage = canvas.toDataURL('image/jpeg', 0.9);
                zip.file(`slide-${i + 1}.jpeg`, slideImage.split(',')[1], { base64: true });
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = `${data.presentationTitle || 'presentation'}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Failed to download presentation:", error);
            alert("An error occurred while preparing the download.");
        } finally {
            setIsDownloading(false);
        }
    };

    const totalSlides = data.slides.length;
    const currentSlide = data.slides[currentSlideIndex];

    const goToNextSlide = () => setCurrentSlideIndex(prev => Math.min(prev + 1, totalSlides - 1));
    const goToPrevSlide = () => setCurrentSlideIndex(prev => Math.max(prev - 1, 0));

    if (!currentSlide) {
         return <div className="bg-gray-800 p-4 rounded-lg border border-red-700 mt-2"><h3 className={`text-xl font-bold mb-2 ${styles.headerText}`}>{data.presentationTitle}</h3><p className="text-red-400">Error: The current slide data could not be loaded.</p></div>;
    }

    const hasContent = Array.isArray(currentSlide.content) && currentSlide.content.length > 0;

    return (
        <div className={`bg-gray-800 p-4 rounded-lg border ${styles.containerBorder} mt-2`}>
            <div className="flex justify-between items-center mb-4">
                 <h3 className={`text-xl font-bold ${styles.headerText}`}>{data.presentationTitle}</h3>
                 <button onClick={handleDownload} disabled={isDownloading} className="bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold py-1 px-3 rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-wait">
                    {isDownloading ? 'Packaging...' : 'Download'}
                 </button>
            </div>
            
            <div className={`aspect-video w-full ${styles.slideBg} rounded-md p-6 flex flex-col shadow-lg`}>
                <h4 className={`text-2xl font-bold mb-4 text-center ${styles.slideTitle}`}>{currentSlide.slideTitle}</h4>
                <div className="flex-grow flex items-stretch justify-center gap-6 min-h-0">
                    {currentSlide.imageUrl && <div className={`flex items-center justify-center ${hasContent ? 'w-1/2' : 'w-full'}`}><img src={currentSlide.imageUrl} alt={currentSlide.slideTitle} className="max-w-full max-h-full object-contain rounded-md shadow-md" /></div>}
                    {hasContent && <div className={`flex items-center ${currentSlide.imageUrl ? 'w-1/2' : 'w-full'}`}><ul className={`list-disc pl-5 text-lg space-y-2 ${styles.slideContent}`}>{currentSlide.content.map((point: string, pIndex: number) => <li key={pIndex}>{point}</li>)}</ul></div>}
                </div>
            </div>

            <div className="flex items-center justify-center mt-4 gap-4">
                <button onClick={goToPrevSlide} disabled={currentSlideIndex === 0} className={`px-4 py-2 rounded-lg text-white font-semibold transition ${styles.navButton} disabled:opacity-50 disabled:cursor-not-allowed`}>Previous</button>
                <span className="text-gray-400 font-mono text-sm">{currentSlideIndex + 1} / {totalSlides}</span>
                <button onClick={goToNextSlide} disabled={currentSlideIndex === totalSlides - 1} className={`px-4 py-2 rounded-lg text-white font-semibold transition ${styles.navButton} disabled:opacity-50 disabled:cursor-not-allowed`}>Next</button>
            </div>

            {/* Hidden container for exporting */}
            <div ref={exportContainerRef} className="absolute -left-[9999px] top-0">
                {isDownloading && data.slides.map((slide: any, index: number) => (
                    <SlideExporter key={index} slide={slide} template={template} styles={styles} />
                ))}
            </div>
        </div>
    );
};

const Message: React.FC<MessageProps> = ({ message, onReaction }) => {
  const isUser = message.sender === Sender.User;
  const parsedHtml = message.text ? marked.parse(message.text) : '';
  
  return (
    <div className={`group flex items-start gap-4 my-4 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && <div className="flex-shrink-0"><AiIcon /></div>}
      
      <div className={`max-w-2xl w-full px-5 py-3 rounded-xl ${isUser ? 'bg-indigo-600' : 'bg-gray-700'}`}>
        {message.isLoading ? (
          <div className="flex items-center gap-2">
            <LoadingSpinner />
            <span>Thinking...</span>
          </div>
        ) : (
          <>
            {message.imageUrl && <img src={message.imageUrl} alt="Generated content" className="rounded-lg mb-2 max-w-sm" />}
            
            <div className="prose prose-invert max-w-none prose-p:my-1 prose-headings:my-2" dangerouslySetInnerHTML={{ __html: parsedHtml }} />

            {message.jsonContent && <PresentationCard data={message.jsonContent} template={message.presentationTemplate || 'Professional'} />}
            
            {message.references && message.references.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                    <h4 className="text-sm font-semibold mb-1 text-gray-400">References:</h4>
                    <ul className="text-xs list-disc pl-5">
                        {message.references.map((ref, index) => (
                            <li key={index}>
                                <a href={ref.web?.uri || ref.maps?.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                                    {ref.web?.title || ref.maps?.title}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
          </>
        )}
      </div>

      {!isUser && !message.isLoading && (
        <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onReaction(message.id, 'like')} className="p-1 rounded-full hover:bg-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${message.reaction === 'like' ? 'text-green-400' : 'text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333V17a1 1 0 001 1h6.758a1 1 0 00.97-1.22l-1.934-6.11A1 1 0 0012 9H7a1 1 0 00-1 1.333zM17 10.5a1.5 1.5 0 11-3 0v6a1.5 1.5 0 013 0v-6z" />
                </svg>
            </button>
             <button onClick={() => onReaction(message.id, 'dislike')} className="p-1 rounded-full hover:bg-gray-600 ml-1">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${message.reaction === 'dislike' ? 'text-red-400' : 'text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
                    <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667V3a1 1 0 00-1-1H6.242a1 1 0 00-.97 1.22l1.934 6.11A1 1 0 008 11h5a1 1 0 001-1.333zM3 9.5a1.5 1.5 0 113 0v-6a1.5 1.5 0 01-3 0v6z" />
                </svg>
            </button>
        </div>
      )}

      {isUser && <div className="flex-shrink-0"><UserIcon/></div>}
    </div>
  );
};

export default Message;