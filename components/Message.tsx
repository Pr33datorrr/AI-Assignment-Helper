
import React from 'react';
import { Message as MessageType, Sender, PresentationTemplate } from '../types';
import { marked } from 'marked';

interface MessageProps {
  message: MessageType;
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
        title: 'text-blue-300',
        slideTitle: 'text-cyan-300',
        border: 'border-blue-700'
    },
    Creative: {
        title: 'text-purple-300',
        slideTitle: 'text-pink-300',
        border: 'border-purple-700'
    },
    Minimalist: {
        title: 'text-gray-200',
        slideTitle: 'text-gray-400',
        border: 'border-gray-600'
    }
};

const PresentationCard: React.FC<{ data: any, template: PresentationTemplate }> = ({ data, template }) => {
    const styles = templateStyles[template] || templateStyles.Professional;
    return (
        <div className={`bg-gray-800 p-4 rounded-lg border ${styles.border} mt-2`}>
            <h3 className={`text-xl font-bold mb-2 ${styles.title}`}>{data.presentationTitle}</h3>
            {data.slides.map((slide: any, index: number) => (
                <div key={index} className="mb-3 pl-4 border-l-2 border-gray-600">
                    <h4 className={`font-semibold ${styles.slideTitle}`}>{index + 1}. {slide.slideTitle}</h4>
                    <ul className="list-disc pl-5 text-gray-300">
                        {slide.content.map((point: string, pIndex: number) => (
                            <li key={pIndex}>{point}</li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
};


const Message: React.FC<MessageProps> = ({ message }) => {
  const isUser = message.sender === Sender.User;
  const parsedHtml = message.text ? marked.parse(message.text) : '';
  
  return (
    <div className={`flex items-start gap-4 my-4 ${isUser ? 'justify-end' : ''}`}>
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

      {isUser && <div className="flex-shrink-0"><UserIcon/></div>}
    </div>
  );
};

export default Message;