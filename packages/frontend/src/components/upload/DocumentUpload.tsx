import { useRef, type DragEvent, type ChangeEvent } from 'react';
import { useDocumentUpload } from '../../hooks/useDocumentUpload';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';

export function DocumentUpload() {
  const { documents, isUploading, uploadError, upload, remove } = useDocumentUpload();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await upload(file);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) await upload(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="doc-upload">
      <h2 className="doc-upload__title">Knowledge Base</h2>
      <p className="doc-upload__subtitle">Upload documents to enable document-based answers</p>

      {/* Drop zone */}
      <div
        className="doc-upload__dropzone"
        onDrop={(e) => void handleDrop(e)}
        onDragOver={handleDragOver}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload document — click or drag and drop"
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md,.markdown"
          className="sr-only"
          onChange={(e) => void handleFileChange(e)}
          disabled={isUploading}
          aria-hidden="true"
        />

        {isUploading ? (
          <div className="doc-upload__uploading">
            <Spinner size="md" label="Uploading document..." />
            <p>Processing document...</p>
          </div>
        ) : (
          <div className="doc-upload__prompt">
            <span className="doc-upload__icon">📎</span>
            <p className="doc-upload__text">
              <strong>Click to upload</strong> or drag &amp; drop
            </p>
            <p className="doc-upload__formats">PDF, TXT, Markdown · Max 10MB</p>
          </div>
        )}
      </div>

      {uploadError && (
        <p className="doc-upload__error" role="alert">
          {uploadError}
        </p>
      )}

      {/* Uploaded documents list */}
      {documents.length > 0 && (
        <ul className="doc-upload__list" aria-label="Uploaded documents">
          {documents.map((doc) => (
            <li key={doc.documentId} className="doc-upload__item">
              <span className="doc-upload__item-icon">📄</span>
              <div className="doc-upload__item-info">
                <span className="doc-upload__item-name" title={doc.fileName}>
                  {doc.fileName}
                </span>
                <span className="doc-upload__item-meta">
                  {doc.chunksCreated} chunks indexed
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void remove(doc.documentId)}
                title="Remove document"
                aria-label={`Remove ${doc.fileName}`}
              >
                ✕
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
