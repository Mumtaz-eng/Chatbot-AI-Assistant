import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Image as ImageIcon, X, Mic, MicOff } from 'lucide-react';
import { ChatAttachment } from '../types';

interface ChatInputProps {
  onSend: (message: string, attachment?: ChatAttachment) => void;
  isLoading: boolean;
  disabled?: boolean;
}

// Extend window interface for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading, disabled }) => {
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<ChatAttachment | undefined>(undefined);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [text]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'ur-PK'; // Default to Urdu (Pakistan) which handles mixed English well
      
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };
      
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          // Permission denied
          alert("Microphone access was denied. Please allow microphone access in your browser settings to use voice input.");
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
      } catch (error) {
        console.error("Failed to start speech recognition:", error);
      }
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!text.trim() && !attachment) || isLoading || disabled) return;
    
    onSend(text.trim(), attachment);
    setText('');
    setAttachment(undefined);
    
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Handle pasting images (Screenshots etc)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault(); // Stop text paste if it's an image
        const file = items[i].getAsFile();
        
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result as string;
            // Parse data:image/xxx;base64,yyyyy
            const matches = base64String.match(/^data:(.+);base64,(.+)$/);
            if (matches) {
               setAttachment({
                 mimeType: matches[1],
                 data: matches[2]
               });
            }
          };
          reader.readAsDataURL(file);
        }
        return; // Only paste the first image found
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Parse data:image/xxx;base64,yyyyy
        const matches = base64String.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
           setAttachment({
             mimeType: matches[1],
             data: matches[2]
           });
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset input value so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = () => {
    setAttachment(undefined);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 bg-transparent">
      <div className={`
          relative flex flex-col p-2 rounded-2xl
          bg-surface border transition-all duration-300
          ${isLoading 
            ? 'border-slate-700 opacity-80 cursor-not-allowed' 
            : 'border-slate-600 hover:border-slate-500 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20'
          }
          shadow-xl
      `}>
        {/* Image Preview */}
        {attachment && (
          <div className="px-3 pt-3 pb-1">
             <div className="relative inline-block">
               <img 
                 src={`data:${attachment.mimeType};base64,${attachment.data}`} 
                 alt="Preview" 
                 className="h-20 w-auto rounded-lg border border-slate-600 object-cover"
               />
               <button
                 onClick={removeAttachment}
                 className="absolute -top-2 -right-2 bg-slate-800 text-slate-400 hover:text-white rounded-full p-1 border border-slate-600 shadow-lg"
               >
                 <X size={12} />
               </button>
             </div>
          </div>
        )}

        <form 
          onSubmit={handleSubmit}
          className="flex items-end gap-2 w-full"
        >
          <div className="pl-3 pb-3 text-slate-400 flex items-center gap-2">
             <Sparkles size={20} className={isLoading ? "animate-pulse text-blue-400" : ""} />
          </div>
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || disabled}
            className="pb-3 text-slate-400 hover:text-blue-400 transition-colors disabled:opacity-50"
            title="Upload Image"
          >
            <ImageIcon size={20} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileSelect}
          />

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={isLoading ? "SochBot is thinking..." : isListening ? "Listening..." : "Ask me anything..."}
            disabled={isLoading || disabled}
            rows={1}
            className="w-full bg-transparent text-slate-200 placeholder-slate-500 text-base md:text-lg px-2 py-3 focus:outline-none resize-none max-h-[200px]"
          />

          {/* Microphone Button */}
          <button
            type="button"
            onClick={toggleListening}
            disabled={isLoading || disabled}
            className={`
              pb-3 mr-1 transition-colors
              ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-400 hover:text-blue-400'}
            `}
            title={isListening ? "Stop Listening" : "Start Voice Input"}
          >
            {isListening ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          <button
            type="submit"
            disabled={(!text.trim() && !attachment) || isLoading || disabled}
            className={`
              p-3 rounded-xl mb-1 mr-1 transition-all duration-200
              ${(!text.trim() && !attachment) || isLoading 
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg hover:shadow-blue-500/20 active:scale-95'
              }
            `}
          >
            <Send size={20} />
          </button>
        </form>
      </div>
      <div className="text-center mt-2">
         <p className="text-[10px] md:text-xs text-slate-500">
           SochBot can make mistakes. Always double-check important information.
         </p>
      </div>
    </div>
  );
};

export default ChatInput;