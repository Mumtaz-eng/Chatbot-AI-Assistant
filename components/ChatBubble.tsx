import React, { useState } from 'react';
import { Bot, User, AlertCircle, Loader2, Cpu, Copy, Check, Download, Volume2, VolumeX } from 'lucide-react';
import { ChatMessage, Role } from '../types';
import MarkdownMessage from './MarkdownMessage';

interface ChatBubbleProps {
  message: ChatMessage;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isUser = message.role === Role.USER;
  const isError = message.isError;

  const handleCopy = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleDownload = (base64Data: string, index: number) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${base64Data}`;
    link.download = `sochbot-image-${Date.now()}-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!message.content) return;

    // Sanitize markdown for speech (simple regex to remove basic markdown)
    const textToSpeak = message.content
      .replace(/[*#`_\[\]]/g, '') // Remove basic markdown chars
      .replace(/https?:\/\/\S+/g, 'link'); // Replace URLs with 'link'

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'ur-PK'; // Default to Urdu/English mix
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel(); // Stop previous
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 group`}>
      <div 
        className={`
          flex max-w-[90%] md:max-w-[80%] lg:max-w-[70%] gap-3
          ${isUser ? 'flex-row-reverse' : 'flex-row'}
        `}
      >
        {/* Avatar */}
        <div 
          className={`
            flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center
            ${isUser ? 'bg-blue-600' : isError ? 'bg-red-500/20' : 'bg-indigo-600'}
            shadow-lg border border-white/10
          `}
        >
          {isUser ? (
            <User size={18} className="text-white" />
          ) : isError ? (
            <AlertCircle size={18} className="text-red-400" />
          ) : (
            <Cpu size={18} className="text-white" />
          )}
        </div>

        {/* Message Content */}
        <div 
          className={`
            flex flex-col
            ${isUser ? 'items-end' : 'items-start'}
            min-w-0 flex-1
          `}
        >
          <div className="flex items-center gap-2 mb-1 px-1">
            <span className="text-xs text-slate-400 font-medium">
              {isUser ? 'You' : 'SochBot'}
            </span>
            <span className="text-[10px] text-slate-600">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div 
            className={`
              relative px-4 py-3 md:px-5 md:py-4 rounded-2xl
              ${isUser 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : isError
                  ? 'bg-red-500/10 text-red-200 border border-red-500/20 rounded-tl-none'
                  : 'bg-surface text-slate-200 rounded-tl-none border border-slate-700/50'
              }
              shadow-md
            `}
          >
            {/* User Uploaded Attachment Display */}
            {message.attachment && (
              <div className="mb-3">
                 <img 
                   src={`data:${message.attachment.mimeType};base64,${message.attachment.data}`}
                   alt="Attachment"
                   className="rounded-lg max-h-[300px] w-auto object-cover border border-white/10"
                 />
              </div>
            )}

            {/* AI Generated Images Display */}
            {message.generatedImages && message.generatedImages.length > 0 && (
              <div className="grid grid-cols-1 gap-3 mb-4">
                {message.generatedImages.map((imgData, idx) => (
                  <div key={idx} className="relative group/image">
                    <img 
                      src={`data:image/png;base64,${imgData}`}
                      alt={`Generated ${idx + 1}`}
                      className="rounded-lg w-full h-auto object-cover border border-slate-600 shadow-xl"
                    />
                    <button
                      onClick={() => handleDownload(imgData, idx)}
                      className="absolute top-2 right-2 bg-slate-900/80 text-white p-1.5 rounded-lg opacity-0 group-hover/image:opacity-100 transition-opacity hover:bg-blue-600"
                      title="Download Image"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {message.isStreaming && !message.content && 
             (!message.generatedImages || message.generatedImages.length === 0) ? (
               <div className="flex items-center gap-2 text-slate-400">
                 <Loader2 className="animate-spin" size={16} />
                 <span className="text-sm">Thinking...</span>
               </div>
            ) : (
              <MarkdownMessage content={message.content} />
            )}
            
            {/* Blinking cursor for streaming response */}
            {!isUser && message.isStreaming && message.content && (
               <span className="inline-block w-2 h-4 ml-1 bg-indigo-400 align-middle animate-pulse" />
            )}

            {/* Action Buttons for Bot Messages */}
            {!isUser && !message.isStreaming && message.content && (
              <div className="mt-3 pt-3 border-t border-slate-700/50 flex justify-end gap-2">
                {/* Speak Button */}
                <button
                  onClick={handleSpeak}
                  className={`
                     flex items-center gap-1.5 text-xs transition-colors py-1 px-2 rounded
                     ${isSpeaking ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}
                  `}
                  title="Read Aloud"
                >
                  {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  <span>{isSpeaking ? 'Stop' : 'Listen'}</span>
                </button>

                {/* Copy Button */}
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors py-1 px-2 rounded hover:bg-slate-700/50"
                  title="Copy full response"
                >
                  {isCopied ? (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Copied All</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy All</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;