
import React from 'react';

export const COLORS = {
  primary: '#4f46e5',
  secondary: '#0ea5e9',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
};

export const formatDriveUrl = (url: string) => {
  if (!url) return '';
  // Convert Google Drive view links to direct image links
  if (url.includes('drive.google.com')) {
    const idMatch = url.match(/\/d\/([^\/]+)\//) || url.match(/id=([^&]+)/);
    if (idMatch && idMatch[1]) {
      return `https://lh3.googleusercontent.com/u/0/d/${idMatch[1]}=w1000`;
    }
  }
  return url;
};

export const getYouTubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};
