import type { UploadedDocument } from '../types';

export async function uploadDocument(file: File): Promise<UploadedDocument> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/documents', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Upload failed: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    documentId: string;
    fileName: string;
    chunksCreated: number;
  };

  return {
    documentId: data.documentId,
    fileName: data.fileName,
    chunksCreated: data.chunksCreated,
    uploadedAt: new Date(),
  };
}

export async function deleteDocument(documentId: string): Promise<void> {
  const response = await fetch(`/api/documents/${documentId}`, { method: 'DELETE' });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Delete failed: ${response.statusText}`);
  }
}
