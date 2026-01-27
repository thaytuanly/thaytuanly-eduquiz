
import React from 'react';
import { formatDriveUrl, getYouTubeId } from '../constants';

interface MediaRendererProps {
  url?: string;
  type?: 'image' | 'video' | 'none';
}

export const MediaRenderer: React.FC<MediaRendererProps> = ({ url, type }) => {
  if (!url || type === 'none') return null;

  if (type === 'image') {
    return (
      <div className="w-full h-full flex items-center justify-center p-2">
        <img 
          src={formatDriveUrl(url)} 
          alt="Content" 
          className="max-w-full max-h-full object-contain rounded-lg shadow-sm" 
        />
      </div>
    );
  }

  if (type === 'video') {
    const videoId = getYouTubeId(url);
    if (!videoId) return <p className="text-red-500 p-4">Link video lỗi</p>;
    
    return (
      <div className="w-full h-full bg-black rounded-lg overflow-hidden shadow-inner">
        <iframe
          className="w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0`}
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    );
  }

  return null;
};
