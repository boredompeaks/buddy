
export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  subject?: string;
  summary?: string;
  attachments?: Attachment[]; 
}

export interface Attachment {
  id: string;
  type: 'image' | 'pdf' | 'file';
  name: string;
  data: string; // Base64
}

export interface ChartDataPoint {
  name: string;
  value: number;
}

export enum ViewMode {
  EDIT = 'EDIT',
  PREVIEW = 'PREVIEW',
  SPLIT = 'SPLIT'
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // Index
  explanation: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  category: 'daily' | 'weekly' | 'exam';
  priority: 'low' | 'medium' | 'high';
}

export type DeepStudyMode = 'synthesize' | 'exam' | 'grade';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
