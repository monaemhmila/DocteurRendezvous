import React, { useEffect, useRef, useState } from 'react';
import * as cornerstone from 'cornerstone-core';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import dicomParser from 'dicom-parser';
import { Loader2 } from 'lucide-react';

// Initialize cornerstone WADO image loader
cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
cornerstoneWADOImageLoader.configure({
  beforeSend: function(xhr: any) {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
  }
});
// Using unminified version for Vite compatibility without worker configs for this demo
cornerstoneWADOImageLoader.webWorkerManager.initialize({
  maxWebWorkers: 1,
  startWebWorkersOnDemand: true,
  taskConfiguration: {
    decodeTask: {
      initializeCodecsOnStartup: false,
      usePDFJS: false,
      strict: false,
    }
  }
});

interface DicomViewerProps {
  url: string;
}

export function DicomViewer({ url }: DicomViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!viewerRef.current) return;
    
    cornerstone.enable(viewerRef.current);

    const loadDicom = async () => {
      try {
        setLoading(true);
        // Prefix with wadouri: for cornerstone wado image loader
        const imageId = `wadouri:${url}`;
        const image = await cornerstone.loadAndCacheImage(imageId);
        
        if (viewerRef.current) {
          cornerstone.displayImage(viewerRef.current, image);
        }
      } catch (err: any) {
        console.error("Error loading DICOM:", err);
        setError("Erreur lors du chargement du fichier DICOM. Le fichier est peut-être corrompu ou non supporté.");
      } finally {
        setLoading(false);
      }
    };

    loadDicom();

    return () => {
      if (viewerRef.current) {
        cornerstone.disable(viewerRef.current);
      }
    };
  }, [url]);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 text-white">
          <Loader2 className="size-10 animate-spin text-emerald-500 mb-4" />
          <p className="text-sm font-mono tracking-widest text-emerald-500 animate-pulse">EXTRACTION DICOM...</p>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black text-red-500 p-6 text-center">
          <p>{error}</p>
        </div>
      )}

      {/* Cornerstone renders canvas inside this div */}
      <div 
        ref={viewerRef} 
        className="w-full h-full"
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}
