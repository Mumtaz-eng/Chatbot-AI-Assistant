import React from 'react';
import { Trash2, Cpu, Github, LogIn, LogOut, MessageSquare, Plus, Clock } from 'lucide-react';
import { ModelConfig, UserProfile, ChatSession } from '../types';
import { AVAILABLE_MODELS } from '../constants';

interface SidebarProps {
  currentModelId: string;
  onModelChange: (id: string) => void;
  onNewChat: () => void;
  isOpen: boolean;
  onClose: () => void;
  user?: UserProfile;
  onLogin: () => void;
  onLogout: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (session: ChatSession) => void;
  onDeleteSession: (e: React.MouseEvent, id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentModelId, 
  onModelChange, 
  onNewChat,
  isOpen,
  onClose,
  user,
  onLogin,
  onLogout,
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession
}) => {
  
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-72 bg-slate-900 border-r border-slate-800
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          flex flex-col h-full
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800">
           <div className="flex items-center gap-3 mb-4">
             <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
               <Cpu size={20} className="text-white" />
             </div>
             <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
               SochBot
             </h1>
           </div>
           
           <button
             onClick={() => {
               onNewChat();
               if (window.innerWidth < 768) onClose();
             }}
             className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 active:scale-95"
           >
             <Plus size={18} />
             <span className="font-semibold text-sm">New Chat</span>
           </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          
          {/* History Section */}
          {sessions.length > 0 && (
            <div className="p-4 pb-0">
               <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
                 <Clock size={12} />
                 History
               </h2>
               <div className="space-y-1">
                 {sessions.map((session) => (
                   <div 
                     key={session.id}
                     onClick={() => {
                       onSelectSession(session);
                       if (window.innerWidth < 768) onClose();
                     }}
                     className={`
                       group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border
                       ${currentSessionId === session.id 
                         ? 'bg-slate-800 border-slate-700 text-blue-400' 
                         : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                       }
                     `}
                   >
                     <div className="flex items-center gap-3 overflow-hidden">
                       <MessageSquare size={16} className={`flex-shrink-0 ${currentSessionId === session.id ? 'text-blue-500' : 'text-slate-600'}`} />
                       <div className="flex flex-col overflow-hidden">
                         <span className="text-sm font-medium truncate">{session.title}</span>
                         <span className="text-[10px] opacity-60">{formatDate(session.timestamp)}</span>
                       </div>
                     </div>
                     
                     <button
                       onClick={(e) => onDeleteSession(e, session.id)}
                       className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                       title="Delete chat"
                     >
                       <Trash2 size={14} />
                     </button>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {/* Model Selection */}
          <div className="p-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1 mt-2">
              Model
            </h2>
            <div className="space-y-2">
              {AVAILABLE_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                      onModelChange(model.id);
                  }}
                  className={`
                    w-full text-left p-3 rounded-xl transition-all border
                    ${currentModelId === model.id 
                      ? 'bg-blue-600/10 border-blue-500/50 text-blue-400' 
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }
                  `}
                >
                  <div className="font-medium text-sm">{model.name}</div>
                  <div className="text-[10px] opacity-70 mt-0.5 truncate">{model.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* User Profile & Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
           {user ? (
             <div className="mb-4 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div className="flex items-center gap-3 mb-3">
                   {user.picture ? (
                     <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
                   ) : (
                     <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                        {user.name.charAt(0)}
                     </div>
                   )}
                   <div className="overflow-hidden">
                      <div className="text-sm font-medium text-slate-200 truncate">{user.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{user.email}</div>
                   </div>
                </div>
                <button 
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-2 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
             </div>
           ) : (
              <button 
                onClick={onLogin}
                className="w-full flex items-center justify-center gap-2 p-3 mb-4 text-sm font-medium bg-white text-slate-900 hover:bg-slate-200 rounded-xl transition-colors"
              >
                <LogIn size={18} />
                Sign in with Google
              </button>
           )}

           <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  Online
              </span>
              <a href="#" className="hover:text-blue-400 transition-colors">
                  <Github size={16} />
              </a>
           </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;