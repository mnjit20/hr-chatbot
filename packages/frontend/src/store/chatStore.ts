import { create } from 'zustand';
import type { Message, UploadedDocument } from '../types';

interface ChatState {
  messages: Message[];
  documents: UploadedDocument[];
  sessionId: string;
  employeeId: string;

  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  appendDelta: (id: string, delta: string) => void;
  clearMessages: () => void;
  addDocument: (doc: UploadedDocument) => void;
  removeDocument: (documentId: string) => void;
  setEmployeeId: (id: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  documents: [],
  sessionId: crypto.randomUUID(),
  employeeId: 'EMP001', // default for demo

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),

  appendDelta: (id, delta) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + delta } : m,
      ),
    })),

  clearMessages: () => set({ messages: [] }),

  addDocument: (doc) =>
    set((state) => ({ documents: [...state.documents, doc] })),

  removeDocument: (documentId) =>
    set((state) => ({
      documents: state.documents.filter((d) => d.documentId !== documentId),
    })),

  setEmployeeId: (employeeId) => set({ employeeId }),
}));
