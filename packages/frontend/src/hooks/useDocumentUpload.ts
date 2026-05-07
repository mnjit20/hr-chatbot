import { useState, useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import { uploadDocument, deleteDocument } from '../services/documentService';

interface UseDocumentUploadReturn {
  documents: ReturnType<typeof useChatStore.getState>['documents'];
  isUploading: boolean;
  uploadError: string | null;
  upload: (file: File) => Promise<void>;
  remove: (documentId: string) => Promise<void>;
}

const ACCEPTED_TYPES = ['application/pdf', 'text/plain', 'text/markdown'];
const MAX_SIZE_MB = 10;

export function useDocumentUpload(): UseDocumentUploadReturn {
  const { documents, addDocument, removeDocument } = useChatStore();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const upload = useCallback(async (file: File) => {
    setUploadError(null);

    if (!ACCEPTED_TYPES.includes(file.type) && !file.name.endsWith('.md')) {
      setUploadError('Unsupported file type. Please upload PDF, TXT, or Markdown files.');
      return;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setUploadError(`File too large. Maximum size is ${MAX_SIZE_MB}MB.`);
      return;
    }

    setIsUploading(true);
    try {
      const doc = await uploadDocument(file);
      addDocument(doc);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [addDocument]);

  const remove = useCallback(async (documentId: string) => {
    try {
      await deleteDocument(documentId);
      removeDocument(documentId);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Delete failed');
    }
  }, [removeDocument]);

  return { documents, isUploading, uploadError, upload, remove };
}
