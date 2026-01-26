
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
      <div className="w-full max-w-2xl mx-auto my-4 rounded-xl overflow-hidden shadow-lg border-4 border-white">
        <img src={formatDriveUrl(url)} alt="Question Content" className="w-full h-auto object-contain bg-gray-100" />
      </div>
    );
  }

  if (type === 'video') {
    const videoId = getYouTubeId(url);
    if (!videoId) return <p className="text-red-500">Link video không hợp lệ</p>;
    
    return (
      <div className="w-full max-w-2xl mx-auto my-4 aspect-video rounded-xl overflow-hidden shadow-lg border-4 border-white">
        <iframe
          className="w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    );
  }

  return null;
};
