import { ChatSession, ChatMessage } from '../types';

const HISTORY_KEY = 'sochbot_chat_history';

export const getSessions = (): ChatSession[] => {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load history", e);
    return [];
  }
};

export const saveSession = (session: ChatSession): ChatSession[] => {
  try {
    const sessions = getSessions();
    const index = sessions.findIndex(s => s.id === session.id);
    
    if (index >= 0) {
      // Update existing session and move to top
      sessions.splice(index, 1);
      sessions.unshift(session);
    } else {
      // Add new session to top
      sessions.unshift(session);
    }
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions));
    return sessions;
  } catch (e) {
    console.error("Failed to save session", e);
    return getSessions();
  }
};

export const deleteSession = (id: string): ChatSession[] => {
  try {
    const sessions = getSessions().filter(s => s.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions));
    return sessions;
  } catch (e) {
    console.error("Failed to delete session", e);
    return getSessions();
  }
};

export const clearAllSessions = (): void => {
  localStorage.removeItem(HISTORY_KEY);
};