import { GoogleGenAI, Chat, GenerateContentResponse, FunctionDeclaration, Type, Tool } from "@google/genai";
import { ChatMessage, Role, ChatAttachment } from "../types";
import { INITIAL_SYSTEM_INSTRUCTION } from "../constants";
import { getMemoryString, saveMemory, deleteMemory } from "./memoryService";
import { addTask, listTasks, completeTask, deleteTask } from "./taskService";

/**
 * Transforms internal message format to the format expected by the SDK for history.
 */
const formatHistory = (messages: ChatMessage[]) => {
  return messages.map(m => {
    const parts: any[] = [];
    
    // Add image part if it exists
    if (m.attachment) {
      parts.push({
        inlineData: {
          mimeType: m.attachment.mimeType,
          data: m.attachment.data
        }
      });
    }

    // Add text part
    parts.push({ text: m.content });

    return {
      role: m.role,
      parts: parts
    };
  });
};

// Define the Memory Tool
const memoryToolDeclaration: FunctionDeclaration = {
  name: "manage_memory",
  description: "Save or delete information about the user (name, preferences, goals, projects) to long-term memory.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        description: "The action to perform: 'save' to remember something, 'delete' to forget something.",
        enum: ["save", "delete"]
      },
      key: {
        type: Type.STRING,
        description: "The category key for the memory (e.g., 'name', 'language_style', 'current_project', 'goal')."
      },
      value: {
        type: Type.STRING,
        description: "The information to save (required for 'save' action)."
      }
    },
    required: ["action", "key"]
  }
};

// Define the Image Generation Tool
const imageGenToolDeclaration: FunctionDeclaration = {
  name: "generate_image",
  description: "Generate an image based on a user's description using an AI image generation model.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: {
        type: Type.STRING,
        description: "The detailed text description of the image to generate. Include style, mood, lighting, etc."
      }
    },
    required: ["prompt"]
  }
};

// Define Task Management Tool
const taskToolDeclaration: FunctionDeclaration = {
  name: "manage_tasks",
  description: "Create, list, complete, or delete tasks and reminders.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        enum: ["add", "list", "complete", "delete"],
        description: "Action to perform on tasks."
      },
      title: {
        type: Type.STRING,
        description: "Title of the task (required for 'add')."
      },
      dueDateTime: {
        type: Type.STRING,
        description: "ISO Date String or clear date/time string for the deadline (required for 'add' if it is a reminder)."
      },
      priority: {
        type: Type.STRING,
        enum: ["low", "medium", "high"],
        description: "Priority level (optional, default medium)."
      },
      taskIdOrKeyword: {
        type: Type.STRING,
        description: "The ID or title keyword of the task to complete or delete."
      }
    },
    required: ["action"]
  }
};


const tools: Tool[] = [
  {
    functionDeclarations: [memoryToolDeclaration, imageGenToolDeclaration, taskToolDeclaration]
  },
  {
    googleSearch: {}
  }
];

/**
 * Creates a chat session and sends a message with streaming response.
 * Handles specialized tool calls for memory, image generation, video generation, and Google Search grounding.
 */
export const streamGeminiResponse = async (
  modelId: string,
  history: ChatMessage[],
  newMessage: string,
  onChunk: (text: string) => void,
  attachment?: ChatAttachment,
  userName?: string,
  onImageGenerated?: (base64Image: string) => void
): Promise<string> => {
  
  try {
    // Initialize the API client dynamically to ensure it uses the latest selected API key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // 1. Prepare System Instruction with Dynamic Memory
    let systemInstruction = INITIAL_SYSTEM_INSTRUCTION;
    
    // Inject User Name if valid
    if (userName) {
      systemInstruction += `\n\nUser Name: "${userName}". Address the user as "${userName}".`;
    }

    // Inject Long-Term Memory
    const currentMemory = getMemoryString();
    if (currentMemory) {
      systemInstruction += `\n\n[Long-Term Memory]:\n${currentMemory}\nUse this context to personalize your responses.`;
    }

    // Inject Current Date/Time for context
    systemInstruction += `\n\nCurrent Date & Time: ${new Date().toLocaleString()}`;

    // 2. Create Chat Session
    const chat: Chat = ai.chats.create({
      model: modelId,
      config: {
        systemInstruction: systemInstruction,
        tools: tools, 
      },
      history: formatHistory(history),
    });

    // 3. Prepare Message Content
    const messageParts: any[] = [];
    if (attachment) {
      messageParts.push({
        inlineData: {
          mimeType: attachment.mimeType,
          data: attachment.data
        }
      });
    }
    messageParts.push({ text: newMessage });

    // 4. Send Message and Handle Response Loop (for Tools)
    let finalResponseText = "";
    
    const sendMessageAndHandleTools = async (parts: any[]) => {
      const resultStream = await chat.sendMessageStream({ 
        message: parts 
      });

      let functionCallFound: any = null;
      let groundingChunks: any[] = [];

      for await (const chunk of resultStream) {
        const c = chunk as GenerateContentResponse;
        
        // Handle Text Chunk
        const chunkText = c.text;
        if (chunkText) {
          finalResponseText += chunkText;
          onChunk(chunkText);
        }

        // Handle Grounding (Search Results)
        if (c.candidates?.[0]?.groundingMetadata?.groundingChunks) {
          groundingChunks.push(...c.candidates[0].groundingMetadata.groundingChunks);
        }

        // Check for Function Calls in the chunk (usually comes in the first or last chunk of a turn)
        const candidates = c.candidates;
        if (candidates && candidates[0]?.content?.parts) {
          for (const part of candidates[0].content.parts) {
             if (part.functionCall) {
                functionCallFound = part.functionCall;
             }
          }
        }
      }

      // Process Grounding Chunks to display sources
      if (groundingChunks.length > 0) {
        const uniqueSources = new Map();
        groundingChunks.forEach(chunk => {
          if (chunk.web?.uri && chunk.web?.title) {
            uniqueSources.set(chunk.web.uri, chunk.web.title);
          }
        });

        if (uniqueSources.size > 0) {
          let sourcesMd = "\n\n**Sources:**\n";
          uniqueSources.forEach((title, uri) => {
            sourcesMd += `- [${title}](${uri})\n`;
          });
          finalResponseText += sourcesMd;
          onChunk(sourcesMd);
        }
      }

      // If a function was called, execute it and send result back
      if (functionCallFound) {
        const { name, args } = functionCallFound;
        
        if (name === 'manage_memory') {
           const action = args['action'];
           const key = args['key'];
           const value = args['value'];
           
           let toolResult = "";
           if (action === 'save') {
             toolResult = saveMemory(key, value);
           } else if (action === 'delete') {
             toolResult = deleteMemory(key);
           }

           const toolResponseParts = [
             {
               functionResponse: {
                 name: name,
                 response: { result: toolResult }
               }
             }
           ];
           
           await sendMessageAndHandleTools(toolResponseParts);
        } 
        else if (name === 'generate_image') {
          const prompt = args['prompt'];
          let toolResult = "";

          try {
            // Call the Image Generation Model separate from the chat model
            // Re-instantiate locally to ensure freshness
            const imageResponse = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: prompt
            });

            // Extract the image
            const imageParts = imageResponse.candidates?.[0]?.content?.parts;
            if (imageParts) {
              for (const part of imageParts) {
                if (part.inlineData && part.inlineData.data) {
                  // Pass the generated image back to the UI via callback
                  if (onImageGenerated) {
                    onImageGenerated(part.inlineData.data);
                  }
                  toolResult = "Image generated successfully and displayed to the user.";
                }
              }
            } else {
              toolResult = "No image data returned from the model.";
            }
          } catch (e: any) {
            console.error("Image generation error:", e);
            toolResult = `Failed to generate image: ${e.message}`;
          }

          const toolResponseParts = [
             {
               functionResponse: {
                 name: name,
                 response: { result: toolResult }
               }
             }
           ];
           
           await sendMessageAndHandleTools(toolResponseParts);
        }
        else if (name === 'manage_tasks') {
          const action = args['action'];
          let toolResult = "";

          if (action === 'add') {
             const title = args['title'];
             const due = args['dueDateTime'];
             const prio = args['priority'] || 'medium';
             if (!title || !due) {
               toolResult = "Error: Title and Due Date are required for adding a task.";
             } else {
               toolResult = addTask(title, due, prio);
             }
          } else if (action === 'list') {
             toolResult = listTasks();
          } else if (action === 'complete') {
             const id = args['taskIdOrKeyword'];
             toolResult = completeTask(id);
          } else if (action === 'delete') {
             const id = args['taskIdOrKeyword'];
             toolResult = deleteTask(id);
          }

          const toolResponseParts = [
             {
               functionResponse: {
                 name: name,
                 response: { result: toolResult }
               }
             }
           ];
           
           await sendMessageAndHandleTools(toolResponseParts);
        }
      }
    };

    await sendMessageAndHandleTools(messageParts);
    return finalResponseText;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};