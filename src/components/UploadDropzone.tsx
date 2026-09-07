import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon, Sparkles, ArrowRight, Zap } from 'lucide-react';
import { SAMPLE_IMAGES } from '../utils/sampleImages';
import type { SampleImage } from '../types';

interface UploadDropzoneProps {
  onImageSelect: (fileOrUrl: File | string) => void;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({ onImageSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onImageSelect(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageSelect(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Interactive Dropzone Container */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-4 ${
          isDragging
            ? 'border-emerald-400 bg-emerald-950/20 scale-[1.01]'
            : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/jpg"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Upload Icon with subtle badge */}
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800/90 border border-zinc-700/80 flex items-center justify-center text-zinc-300 group-hover:text-emerald-400 group-hover:border-emerald-500/40 transition-colors shadow-lg">
            <UploadCloud className="w-7 h-7" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center">
            <Zap className="w-3 h-3 fill-current" />
          </div>
        </div>

        <div className="space-y-1.5 max-w-md">
          <h3 className="text-base sm:text-lg font-medium text-zinc-100">
            Tap or drag & drop an image
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400">
            JPG, PNG, WebP up to 10MB. Automatically optimized for mobile bandwidth.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 text-xs font-medium text-zinc-300 border border-zinc-700/80 group-hover:bg-emerald-500 group-hover:text-zinc-950 group-hover:border-emerald-400 transition-all tactile-btn">
          <span>Select Photo from Device</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Quick Test Sample Images Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-medium">
              Or Try Instant Test Scenarios (1-Tap Demo)
            </span>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">Zero network needed</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SAMPLE_IMAGES.map((sample: SampleImage) => (
            <div
              key={sample.id}
              onClick={() => onImageSelect(sample.url)}
              className="tactile-btn group text-left cursor-pointer rounded-xl bg-zinc-900/60 border border-zinc-800/90 hover:border-emerald-500/50 hover:bg-zinc-900 p-3 flex items-center gap-3 transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                <img
                  src={sample.url}
                  alt={sample.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-zinc-200 truncate group-hover:text-emerald-400 transition-colors">
                  {sample.name}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[10px] font-mono text-zinc-400">
                    {sample.category}
                  </span>
                </div>
              </div>

              <ImageIcon className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 shrink-0 transition-colors" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
