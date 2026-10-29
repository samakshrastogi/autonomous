import React, { useState, useRef } from 'react';
import { UploadCloud, FileVideo, Sparkles, AlertCircle, Timer, MessageSquare } from 'lucide-react';

export default function VideoUploader({ onUploadSuccess, channelHandle = '@SamakshGaming' }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    setError('');
    const validExtensions = ['.mp4', '.mov', '.webm', '.mkv'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      setError('Please select a valid video (.mp4, .mov, .webm, or .mkv).');
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      setError('File exceeds 500MB limit.');
      return;
    }

    setSelectedFile(file);
    startUpload(file);
  };

  const startUpload = (file) => {
    setIsUploading(true);
    setUploadProgress(0);
    setError('');

    const formData = new FormData();
    formData.append('video', file);
    formData.append('channelMode', 'gaming');
    formData.append('channelHandle', channelHandle);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload-video', true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      setIsUploading(false);
      if (xhr.status === 200) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.success && res.file) {
            if (onUploadSuccess) {
              onUploadSuccess(res.file);
            }
          } else {
            setError(res.error || 'Upload failed.');
          }
        } catch (e) {
          setError('Failed to parse server response.');
        }
      } else {
        setError(`Upload failed (Status ${xhr.status})`);
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setError('Network connection error.');
    };

    xhr.send(formData);
  };

  return (
    <div className="studio-card upload-card compact-card">
      <div className="studio-card-header compact-header">
        <div className="studio-icon-badge mini" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
          <UploadCloud size={16} />
        </div>
        <div className="compact-header-text">
          <h2 className="studio-card-title compact-title">Upload Gaming Short</h2>
          <p className="studio-card-subtitle compact-subtitle">Silent clips, chess moves & puzzles</p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div
        className={`upload-dropzone compact-dropzone ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <div className="compact-dropzone-content">
          <div className="compact-upload-icon-circle">
            {isUploading ? (
              <FileVideo size={18} className="animate-pulse" color="#38bdf8" />
            ) : (
              <UploadCloud size={18} color="#38bdf8" />
            )}
          </div>

          <div className="compact-upload-text">
            <span className="upload-main-text">
              {isUploading ? 'Uploading Video...' : 'Drop video or click to browse'}
            </span>
            <span className="upload-sub-text">
              MP4, MOV, WEBM • Up to 500MB
            </span>
          </div>
        </div>

        {isUploading && (
          <div className="compact-progress-row">
            <div className="upload-progress-bar">
              <div
                className="upload-progress-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="upload-percent-text">{uploadProgress}%</span>
          </div>
        )}
      </div>

      {error && (
        <div className="sidebar-error-box compact" style={{ marginTop: '0.45rem' }}>
          <AlertCircle size={14} color="#ef4444" style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Sleek feature chips row - replaces bulky multi-line box */}
      <div className="compact-feature-chips">
        <div className="feature-chip" title="Detects silent chess board moves with AI Vision">
          <Sparkles size={11} color="#facc15" />
          <span>Silent AI Vision</span>
        </div>
        <div className="feature-chip" title="5s interactive timer overlay">
          <Timer size={11} color="#38bdf8" />
          <span>5s Timer</span>
        </div>
        <div className="feature-chip" title="Comment your move watermark">
          <MessageSquare size={11} color="#34d399" />
          <span>Move CTA</span>
        </div>
      </div>
    </div>
  );
}
