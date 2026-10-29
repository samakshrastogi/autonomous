import React, { useState, useRef } from 'react';
import { UploadCloud, FileVideo, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

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
      setError('Please select a valid video file (.mp4, .mov, .webm, or .mkv).');
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      setError('File size exceeds the 500MB upload limit.');
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
          setError('Failed to parse server upload response.');
        }
      } else {
        setError(`Upload failed with server status ${xhr.status}`);
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setError('Network connection error during file upload.');
    };

    xhr.send(formData);
  };

  return (
    <div className="studio-card upload-card">
      <div className="studio-card-header">
        <div className="studio-icon-badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
          <UploadCloud size={20} />
        </div>
        <div>
          <h2 className="studio-card-title">Upload Gaming Short</h2>
          <p className="studio-card-subtitle">Silent videos, chess puzzles & tricks</p>
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
        className={`upload-dropzone ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <div className="upload-dropzone-inner">
          <div className="upload-icon-circle">
            {isUploading ? (
              <FileVideo size={28} className="animate-pulse" color="#38bdf8" />
            ) : (
              <UploadCloud size={30} color="#38bdf8" />
            )}
          </div>

          <div className="upload-text-wrap">
            <span className="upload-main-text">
              {isUploading ? 'Uploading Clip...' : 'Click or Drag & Drop Video'}
            </span>
            <span className="upload-sub-text">
              MP4, MOV, WEBM (No audio needed)
            </span>
          </div>

          {isUploading && (
            <div className="upload-progress-container">
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
      </div>

      {error && (
        <div className="sidebar-error-box compact" style={{ marginTop: '0.75rem' }}>
          <AlertCircle size={15} color="#ef4444" style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <div className="upload-tips-box">
        <div className="upload-tip-item">
          <Sparkles size={13} color="#facc15" />
          <span>Gemini Vision analyzes visual board moves with <strong>no audio</strong></span>
        </div>
        <div className="upload-tip-item">
          <span style={{ fontSize: '0.75rem' }}>⏳</span>
          <span>Adds <strong>5s countdown timer</strong> + "Comment your move" CTA</span>
        </div>
      </div>
    </div>
  );
}
