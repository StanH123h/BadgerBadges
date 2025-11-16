'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export default function FileUploadModal({ show, onClose, onSubmit, achievementName }) {
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      alert('Please upload a proof file');
      return;
    }

    setUploading(true);

    // Simulate file upload (in real implementation, upload to backend)
    await new Promise(resolve => setTimeout(resolve, 1500));

    onSubmit({
      file,
      description,
      timestamp: Date.now(),
    });

    // Reset form
    setFile(null);
    setDescription('');
    setUploading(false);
  };

  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      setDescription('');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 9999,
            }}
          />

          {/* Modal Container */}
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 10000,
              maxWidth: '500px',
              width: '90%',
            }}
          >
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', duration: 0.5 }}
              style={{
                background: 'white',
                borderRadius: '1.5rem',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                padding: '2rem',
              }}
            >
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #c5050c 0%, #9b0000 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  fontSize: '3rem',
                }}
              >
                📄
              </motion.div>

              {/* Title */}
              <h2 style={{
                fontSize: '1.75rem',
                fontWeight: 'bold',
                textAlign: 'center',
                marginBottom: '0.5rem',
                color: '#1f2937',
              }}>
                Submit Proof for Verification
              </h2>

              {/* Achievement Name */}
              <p style={{
                fontSize: '1rem',
                textAlign: 'center',
                color: '#6b7280',
                marginBottom: '1.5rem',
              }}>
                {achievementName}
              </p>

              {/* Instructions */}
              <div style={{
                background: '#fef3c7',
                padding: '1rem',
                borderRadius: '0.75rem',
                marginBottom: '1.5rem',
                fontSize: '0.875rem',
                color: '#92400e',
              }}>
                <strong>📋 Instructions:</strong>
                <ul style={{ margin: '0.5rem 0 0 1.5rem', paddingLeft: 0 }}>
                  <li>Upload proof document (transcript, certificate, etc.)</li>
                  <li>Add a brief description (optional)</li>
                  <li>Your submission will be reviewed by administrators</li>
                  <li>You'll be notified once approved</li>
                </ul>
              </div>

              {/* File Upload */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem',
                }}>
                  Upload Proof Document *
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  disabled={uploading}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '2px dashed #d1d5db',
                    fontSize: '0.875rem',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                  }}
                />
                {file && (
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#10b981',
                    marginTop: '0.5rem',
                  }}>
                    ✅ Selected: {file.name}
                  </p>
                )}
              </div>

              {/* Description */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem',
                }}>
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={uploading}
                  placeholder="Add any additional context or notes..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #d1d5db',
                    fontSize: '0.875rem',
                    resize: 'vertical',
                    fontFamily: 'system-ui, sans-serif',
                  }}
                />
              </div>

              {/* Buttons */}
              <div style={{
                display: 'flex',
                gap: '1rem',
              }}>
                <motion.button
                  onClick={handleClose}
                  disabled={uploading}
                  whileHover={!uploading ? { scale: 1.05 } : {}}
                  whileTap={!uploading ? { scale: 0.95 } : {}}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    borderRadius: '0.75rem',
                    border: 'none',
                    background: '#e5e7eb',
                    color: '#374151',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    opacity: uploading ? 0.5 : 1,
                  }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleSubmit}
                  disabled={uploading || !file}
                  whileHover={!uploading && file ? { scale: 1.05 } : {}}
                  whileTap={!uploading && file ? { scale: 0.95 } : {}}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    borderRadius: '0.75rem',
                    border: 'none',
                    background: uploading || !file
                      ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                      : 'linear-gradient(135deg, #c5050c 0%, #9b0000 100%)',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    cursor: uploading || !file ? 'not-allowed' : 'pointer',
                  }}
                >
                  {uploading ? '⏳ Submitting...' : '📤 Submit for Review'}
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
