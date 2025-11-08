import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { XIcon } from './icons/XIcon';
import { SwitchCameraIcon } from './icons/SwitchCameraIcon';
import { CheckIcon } from './icons/CheckIcon';
import { ResetIcon } from './icons/ResetIcon';

// Helper to convert data URL to File
function dataURLtoFile(dataurl: string, filename: string): File {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
        throw new Error('Invalid data URL');
    }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageCapture: (file: File) => void;
}

const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onImageCapture }) => {
  const { translations } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startStream = useCallback(async () => {
    stopStream();
    setError(null);
    setCapturedImage(null);

    // Define a sequence of constraints to try, from most specific to most general.
    const constraintsToTry = [
      { video: { facingMode: { exact: facingMode } } },
      { video: { facingMode } },
      { video: true } // Most generic fallback
    ];

    let stream = null;
    let lastError = null;

    for (const constraints of constraintsToTry) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (stream) {
          lastError = null; // Success, clear any previous error
          break; // Exit the loop on success
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (stream && videoRef.current) {
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
    } else {
      console.error("Error starting camera stream:", lastError);
      setError(translations.cameraModalError);
    }
  }, [facingMode, stopStream, translations.cameraModalError]);
  
  useEffect(() => {
    const checkCameras = async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoInputs = devices.filter(device => device.kind === 'videoinput');
            setHasMultipleCameras(videoInputs.length > 1);
        } catch (e) {
            console.error("Could not enumerate devices:", e);
        }
    };
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      checkCameras();
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      startStream();
    } else {
      stopStream();
    }
    return stopStream;
  }, [isOpen, startStream, stopStream]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(dataUrl);
    }
  };
  
  const handleRetake = () => {
    setCapturedImage(null);
  };
  
  const handleUsePhoto = () => {
    if (capturedImage) {
      const file = dataURLtoFile(capturedImage, `capture-${Date.now()}.jpg`);
      onImageCapture(file);
      onClose();
    }
  };

  const handleSwitchCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in" aria-modal="true" role="dialog">
      <div className="bg-slate-900 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/50 to-transparent z-10 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">{translations.cameraModalTitle}</h3>
            <button onClick={onClose} className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors" aria-label={translations.cameraModalClose}>
                <XIcon className="w-6 h-6" />
            </button>
        </div>
        
        <div className="flex-grow bg-black flex items-center justify-center overflow-hidden">
            {error ? (
                <div className="text-center text-red-400 p-8">
                    <p>{error}</p>
                    <button onClick={startStream} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors">{translations.cameraModalTryAgain}</button>
                </div>
            ) : (
                <>
                    <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-contain ${capturedImage ? 'hidden' : 'block'}`}></video>
                    {capturedImage && <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />}
                </>
            )}
            <canvas ref={canvasRef} className="hidden"></canvas>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent z-10">
          {capturedImage ? (
             <div className="flex items-center justify-around w-full">
                <button onClick={handleRetake} className="flex items-center gap-2 text-white/90 hover:text-white transition-colors p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                    <ResetIcon className="w-6 h-6" />
                    <span className="font-semibold">{translations.cameraModalRetake}</span>
                </button>
                <button onClick={handleUsePhoto} className="flex items-center gap-2 text-white bg-indigo-600 hover:bg-indigo-500 transition-colors p-3 px-4 rounded-lg font-semibold">
                    <CheckIcon className="w-6 h-6"/>
                    <span>{translations.cameraModalUsePhoto}</span>
                </button>
             </div>
          ) : (
            <div className="flex items-center justify-between w-full max-w-sm mx-auto">
                <div className="w-16 h-16 flex items-center justify-center">
                    {/* Placeholder for alignment */}
                </div>
                <button onClick={handleCapture} className="w-20 h-20 rounded-full bg-white flex items-center justify-center border-4 border-slate-900 shadow-lg transition-transform hover:scale-105" aria-label={translations.cameraModalTakePhoto}>
                    <div className="w-16 h-16 rounded-full bg-white ring-2 ring-inset ring-slate-900"></div>
                </button>
                <div className="w-16 h-16 flex items-center justify-center">
                    {hasMultipleCameras && (
                        <button onClick={handleSwitchCamera} className="p-4 rounded-full bg-white/20 text-white/90 hover:text-white hover:bg-white/30 backdrop-blur-sm transition-colors" aria-label={translations.cameraModalSwitchCamera}>
                            <SwitchCameraIcon className="w-7 h-7" />
                        </button>
                    )}
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraModal;