export interface MemoryData {
  [key: string]: string;
}

const MEMORY_KEY = 'sochbot_memory';

export const getMemory = (): MemoryData => {
  try {
    const data = localStorage.getItem(MEMORY_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error("Failed to load memory", e);
    return {};
  }
};

export const getMemoryString = (): string => {
  const mem = getMemory();
  if (Object.keys(mem).length === 0) return "";
  
  return Object.entries(mem)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join('\n');
};

export const saveMemory = (key: string, value: string): string => {
  try {
    const memory = getMemory();
    memory[key] = value;
    localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
    return `Successfully remembered: ${key} = ${value}`;
  } catch (e) {
    return "Failed to save memory.";
  }
};

export const deleteMemory = (key: string): string => {
  try {
    const memory = getMemory();
    if (key in memory) {
      delete memory[key];
      localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
      return `Successfully forgot: ${key}`;
    }
    return `No memory found for: ${key}`;
  } catch (e) {
    return "Failed to delete memory.";
  }
};