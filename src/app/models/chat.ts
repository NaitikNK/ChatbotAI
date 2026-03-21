export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  text: string;
  createdAt: number;
}

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  draftMessage?: string;
}

