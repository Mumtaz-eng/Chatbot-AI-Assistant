import { Task } from '../types';
import { v4 as uuidv4 } from 'uuid';

const TASKS_KEY = 'sochbot_tasks';

export const getTasks = (): Task[] => {
  try {
    const data = localStorage.getItem(TASKS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load tasks", e);
    return [];
  }
};

const saveTasks = (tasks: Task[]) => {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
};

export const addTask = (title: string, dueDateTime: string, priority: 'low' | 'medium' | 'high' = 'medium'): string => {
  const tasks = getTasks();
  const newTask: Task = {
    id: uuidv4(),
    title,
    dueDateTime,
    priority,
    completed: false,
    notified: false
  };
  tasks.push(newTask);
  saveTasks(tasks);
  return `Task added: "${title}" due on ${new Date(dueDateTime).toLocaleString()} (Priority: ${priority})`;
};

export const listTasks = (showCompleted = false): string => {
  const tasks = getTasks();
  const filtered = showCompleted ? tasks : tasks.filter(t => !t.completed);
  
  if (filtered.length === 0) return "No active tasks found.";

  return filtered.map((t, index) => 
    `${index + 1}. [${t.completed ? '✓' : ' '}] ${t.title} \n   Due: ${new Date(t.dueDateTime).toLocaleString()} | Priority: ${t.priority} | ID: ${t.id}`
  ).join('\n\n');
};

export const completeTask = (taskIdOrIndex: string): string => {
  const tasks = getTasks();
  // Try to find by ID first
  let taskIndex = tasks.findIndex(t => t.id === taskIdOrIndex);
  
  // If not found by ID, try to interpret as visual index (1-based)
  if (taskIndex === -1 && !isNaN(parseInt(taskIdOrIndex))) {
     const visualIndex = parseInt(taskIdOrIndex) - 1;
     // We need to match against the *filtered* list the user likely saw, but for simplicity, we search the full list
     // A better approach for LLM is to use exact ID or Fuzzy match title.
     // For now, let's assume LLM passes the ID if it can, or we implement simple title search.
  }

  // Fallback: search by title partial match
  if (taskIndex === -1) {
    taskIndex = tasks.findIndex(t => t.title.toLowerCase().includes(taskIdOrIndex.toLowerCase()));
  }

  if (taskIndex !== -1) {
    tasks[taskIndex].completed = true;
    saveTasks(tasks);
    return `Task "${tasks[taskIndex].title}" marked as complete.`;
  }
  return "Task not found.";
};

export const deleteTask = (taskIdOrIndex: string): string => {
  let tasks = getTasks();
  let taskIndex = tasks.findIndex(t => t.id === taskIdOrIndex);

  if (taskIndex === -1) {
     taskIndex = tasks.findIndex(t => t.title.toLowerCase().includes(taskIdOrIndex.toLowerCase()));
  }

  if (taskIndex !== -1) {
    const removed = tasks.splice(taskIndex, 1);
    saveTasks(tasks);
    return `Task "${removed[0].title}" deleted.`;
  }
  return "Task not found.";
};

export const checkDueTasks = (): Task[] => {
  const tasks = getTasks();
  const now = new Date();
  const dueTasks: Task[] = [];
  let updated = false;

  tasks.forEach(t => {
    if (!t.completed && !t.notified && new Date(t.dueDateTime) <= now) {
      t.notified = true;
      dueTasks.push(t);
      updated = true;
    }
  });

  if (updated) {
    saveTasks(tasks);
  }

  return dueTasks;
};