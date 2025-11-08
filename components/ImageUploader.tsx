import React, { useRef, useState } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { CameraIcon } from './icons/CameraIcon';
import { useLanguage } from '../context/LanguageContext';
import CameraModal from './CameraModal';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  onAnalyze: () => void;
  imagePreview: string | null;
  isLoading: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, onAnalyze, imagePreview, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const { translations } = useLanguage();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageUpload(file);
    }
    event.target.value = '';
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCameraClick = () => {
    setIsCameraOpen(true);
  };
  
  const handleImageCapture = (file: File) => {
    onImageUpload(file);
    setIsCameraOpen(false);
  };

  return (
    <>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100 mb-2">{translations.imageUploaderTitle}</h2>
        <p className="text-gray-500 dark:text-slate-400 mb-6">{translations.imageUploaderSubtitle}</p>

        <div className="w-full max-w-lg mx-auto aspect-video bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-slate-500 overflow-hidden relative group">
          {imagePreview ? (
            <>
              <img src={imagePreview} alt="Fridge content" className="object-cover w-full h-full" />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button
                  onClick={handleUploadClick}
                  className="p-2 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-gray-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all duration-200 shadow-lg"
                  aria-label={translations.changeFileButton}
                >
                  <UploadIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={handleCameraClick}
                  className="p-2 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-gray-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all duration-200 shadow-lg"
                  aria-label={translations.retakePhotoButton}
                >
                  <CameraIcon className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center w-full h-full p-4">
              <div className="flex items-center gap-4 sm:gap-8">
                <button onClick={handleUploadClick} className="flex flex-col items-center justify-center gap-3 p-6 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-200/50 dark:hover:bg-slate-600/50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200">
                  <UploadIcon className="w-12 h-12 sm:w-16 sm:h-16" />
                  <span className="font-semibold text-center">{translations.uploadFileButton}</span>
                </button>
                <div className="h-24 w-px bg-gray-300 dark:bg-slate-600"></div>
                <button onClick={handleCameraClick} className="flex flex-col items-center justify-center gap-3 p-6 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-200/50 dark:hover:bg-slate-600/50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200">
                  <CameraIcon className="w-12 h-12 sm:w-16 sm:h-16" />
                  <span className="font-semibold text-center">{translations.useCameraButton}</span>
                </button>
              </div>
            </div>
          )}
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
        />
        
        <button
          onClick={onAnalyze}
          disabled={!imagePreview || isLoading}
          className="mt-6 w-full max-w-lg mx-auto bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors duration-300 flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {translations.analyzingButton}...
            </>
          ) : translations.findRecipesButton}
        </button>
      </div>

      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onImageCapture={handleImageCapture}
      />
    </>
  );
};

export default ImageUploader;