import React, { useState, useRef } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Loader2, ZoomIn, ZoomOut, Maximize, RotateCw, X, Download, ImageIcon, Settings2, Sparkles, Ruler, Grid3X3, Sun, Contrast, Monitor, SplitSquareHorizontal, MousePointer2, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DicomViewer } from './DicomViewer';

interface MedicalImageViewerProps {
  patientId: string;
  images: { id: string; url: string; title: string; date: string }[];
  onUploadSuccess: () => void;
}

export function MedicalImageViewer({ patientId, images, onUploadSuccess }: MedicalImageViewerProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  // Advanced Medical Viewer States
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [invert, setInvert] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [isSimulatingAI, setIsSimulatingAI] = useState(false);
  
  // Enterprise Features
  const [compareImageId, setCompareImageId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'pan' | 'measure' | 'draw'>('pan');
  const [measurePoints, setMeasurePoints] = useState<{x: number, y: number}[]>([]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      // POST multipart/form-data
      await api.post(`/patients/${patientId}/files`, formData);
      toast.success("Fichier uploadé avec succès");
      onUploadSuccess();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'upload du fichier");
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = ''; // reset input
    }
  };

  const handleAIToggle = () => {
    if (showAI) {
      setShowAI(false);
      return;
    }
    setIsSimulatingAI(true);
    toast.info("Analyse IA en cours...", { icon: <Sparkles className="text-primary size-4" /> });
    setTimeout(() => {
      setIsSimulatingAI(false);
      setShowAI(true);
      toast.success("Analyse terminée. Anomalies potentielles surlignées.");
    }, 1500);
  };

  const resetFilters = () => {
    setBrightness(100);
    setContrast(100);
    setInvert(false);
    setRotation(0);
    setActiveTool('pan');
    setMeasurePoints([]);
  };

  const activeImage = images.find(img => img.id === selectedImage);
  const compareImage = images.find(img => img.id === compareImageId);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'measure') {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      if (measurePoints.length === 2) {
        setMeasurePoints([{x, y}]); // reset
      } else {
        setMeasurePoints([...measurePoints, {x, y}]);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {images.map((img) => (
          <div 
            key={img.id}
            onClick={() => {
              setSelectedImage(img.id);
              setRotation(0);
            }}
            className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-surface/50 cursor-pointer hover:border-primary/50 transition-colors"
          >
            <img 
              src={img.url} 
              alt={img.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
              <p className="text-sm font-medium text-white truncate">{img.title}</p>
              <p className="text-xs text-white/70">{img.date}</p>
            </div>
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Maximize className="size-6 text-white" />
            </div>
          </div>
        ))}

        {/* Upload Button Placeholder */}
        <label className={`aspect-square flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-surface/30 text-muted-foreground hover:bg-surface/50 hover:text-white hover:border-white/40 cursor-pointer transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
          <input type="file" accept="image/*,application/pdf,.dcm" className="hidden" onChange={handleUpload} disabled={isUploading} />
          {isUploading ? (
            <Loader2 className="size-8 animate-spin opacity-50" />
          ) : (
            <ImageIcon className="size-8 opacity-50" />
          )}
          <span className="text-sm font-medium">{isUploading ? "Upload en cours..." : "Uploader une image"}</span>
        </label>
      </div>

      {/* Advanced Fullscreen Viewer Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => {
        if (!open) {
          setSelectedImage(null);
          resetFilters();
          setShowAI(false);
        }
      }}>
        <DialogContent className="max-w-[100vw] w-screen h-screen bg-black border-none p-0 flex overflow-hidden rounded-none m-0">
          {activeImage && (
            <TooltipProvider>
            <div className="flex w-full h-full">
              
              {/* Left Toolbar - Pro Medical Style */}
              <div className="w-16 bg-[#0a0a0a] border-r border-white/10 flex flex-col items-center py-4 gap-4 z-20">
                <div className="text-primary font-bold text-xl mb-4">
                  <Monitor className="size-6" />
                </div>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className={`text-white hover:bg-white/10 ${invert ? 'bg-white/20' : ''}`} onClick={() => setInvert(!invert)}>
                      <Contrast className="size-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-zinc-800 text-white border-zinc-700">Inverser les couleurs</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setRotation(r => r + 90)}>
                      <RotateCw className="size-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-zinc-800 text-white border-zinc-700">Pivoter</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className={`text-white hover:bg-white/10 ${showGrid ? 'bg-white/20' : ''}`} onClick={() => setShowGrid(!showGrid)}>
                      <Grid3X3 className="size-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-zinc-800 text-white border-zinc-700">Grille de mesure</TooltipContent>
                </Tooltip>

                <div className="w-8 h-px bg-white/10 my-2" />
                
                {/* Enterprise Tools */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className={`text-white hover:bg-white/10 ${activeTool === 'pan' ? 'bg-primary/20 text-primary' : ''}`} onClick={() => setActiveTool('pan')}>
                      <MousePointer2 className="size-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-zinc-800 text-white border-zinc-700">Déplacer / Zoomer</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className={`text-white hover:bg-white/10 ${activeTool === 'measure' ? 'bg-primary/20 text-primary' : ''}`} onClick={() => setActiveTool('measure')}>
                      <Ruler className="size-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-zinc-800 text-white border-zinc-700">Règle de mesure</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className={`text-white hover:bg-white/10 ${activeTool === 'draw' ? 'bg-primary/20 text-primary' : ''}`} onClick={() => setActiveTool('draw')}>
                      <PenTool className="size-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-zinc-800 text-white border-zinc-700">Annotations</TooltipContent>
                </Tooltip>

                <div className="w-8 h-px bg-white/10 my-2" />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`text-white hover:bg-primary/20 hover:text-primary transition-all relative ${showAI ? 'bg-primary/20 text-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]' : ''}`}
                      onClick={handleAIToggle}
                      disabled={isSimulatingAI}
                    >
                      {isSimulatingAI ? <Loader2 className="size-5 animate-spin" /> : <Sparkles className="size-5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-zinc-800 text-white border-zinc-700">Analyse Sanovia AI</TooltipContent>
                </Tooltip>

              </div>

              {/* Viewer Area (Split capable) */}
              <div className="flex-1 relative overflow-hidden bg-black flex">
                
                {/* Main Viewport */}
                <div className="flex-1 relative border-r border-white/5 flex flex-col">
                  {/* Top Overlay HUD */}
                  <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-start z-20 pointer-events-none">
                    <div className="text-emerald-400 font-mono text-xs tracking-wider space-y-1 drop-shadow-md">
                      <p>SANOVIA PACS SYSTEM V2.4</p>
                      <p>PATIENT ID: {patientId.slice(-6).toUpperCase()}</p>
                      <p>SCAN: {activeImage.title.toUpperCase()}</p>
                    </div>
                    <div className="text-right text-emerald-400 font-mono text-xs tracking-wider space-y-1 drop-shadow-md">
                      <p>{activeImage.date}</p>
                      <p>WL: {brightness} WW: {contrast}</p>
                      <p>TOOL: {activeTool.toUpperCase()}</p>
                    </div>
                  </div>

                {/* Right Corner Buttons */}
                <div className="absolute top-4 right-4 flex items-center gap-2 z-30">
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full bg-black/40 backdrop-blur-md border border-white/10" onClick={() => {
                    const a = document.createElement('a');
                    a.href = activeImage.url;
                    a.download = activeImage.title;
                    a.click();
                  }}>
                    <Download className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-red-500/20 hover:text-red-400 rounded-full bg-black/40 backdrop-blur-md border border-white/10" onClick={() => setSelectedImage(null)}>
                    <X className="size-5" />
                  </Button>
                </div>

                {/* Grid Overlay */}
                {showGrid && (
                  <div className="absolute inset-0 pointer-events-none z-10 opacity-20"
                       style={{ backgroundImage: 'linear-gradient(#00ff00 1px, transparent 1px), linear-gradient(90deg, #00ff00 1px, transparent 1px)', backgroundSize: '50px 50px' }}
                  />
                )}

                <TransformWrapper initialScale={1} minScale={0.5} maxScale={8} centerOnInit wheel={{ step: 0.1 }} disabled={activeTool !== 'pan'}>
                  {({ zoomIn, zoomOut, resetTransform }) => (
                    <>
                      {/* Zoom Controls HUD */}
                      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md z-30">
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full h-8 w-8" onClick={() => zoomOut()}>
                          <ZoomOut className="size-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 rounded-full h-8 px-4 text-xs font-mono" onClick={() => { resetTransform(); resetFilters(); }}>
                          RESET
                        </Button>
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full h-8 w-8" onClick={() => zoomIn()}>
                          <ZoomIn className="size-4" />
                        </Button>
                      </div>

                      <TransformComponent wrapperStyle={{ width: "100%", height: "100%", cursor: activeTool === 'pan' ? 'grab' : 'crosshair' }} contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div className="relative inline-block h-full w-full flex items-center justify-center" onClick={handleImageClick}>
                          
                          {activeImage.title.toLowerCase().endsWith('.dcm') || activeImage.url.toLowerCase().endsWith('.dcm') ? (
                             <div className="w-full h-full shadow-2xl" style={{ filter: `brightness(${brightness}%) contrast(${contrast}%) ${invert ? 'invert(100%)' : ''}` }}>
                               <DicomViewer url={activeImage.url} />
                             </div>
                          ) : (
                            <img 
                              src={activeImage.url} 
                              alt={activeImage.title} 
                              style={{ 
                                transform: `rotate(${rotation}deg)`,
                                filter: `brightness(${brightness}%) contrast(${contrast}%) ${invert ? 'invert(100%)' : ''}`,
                                transition: 'transform 0.3s ease, filter 0.1s ease',
                                maxHeight: '100%',
                                maxWidth: '100%',
                                objectFit: 'contain'
                              }}
                              className="select-none shadow-2xl"
                              draggable={false}
                            />
                          )}

                          {/* Fake Measurement Line */}
                          {measurePoints.length > 0 && (
                            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 50 }}>
                              {measurePoints.map((p, i) => (
                                <circle key={i} cx={p.x} cy={p.y} r={4} fill="#10b981" />
                              ))}
                              {measurePoints.length === 2 && (
                                <>
                                  <line x1={measurePoints[0]!.x} y1={measurePoints[0]!.y} x2={measurePoints[1]!.x} y2={measurePoints[1]!.y} stroke="#10b981" strokeWidth="2" strokeDasharray="4" />
                                  <text x={(measurePoints[0]!.x + measurePoints[1]!.x)/2} y={(measurePoints[0]!.y + measurePoints[1]!.y)/2 - 10} fill="#10b981" fontSize="14" fontWeight="bold" textAnchor="middle" style={{ textShadow: '1px 1px 2px black' }}>
                                    {Math.round(Math.hypot(measurePoints[1]!.x - measurePoints[0]!.x, measurePoints[1]!.y - measurePoints[0]!.y) * 0.12)} mm
                                  </text>
                                </>
                              )}
                            </svg>
                          )}

                          {/* Drawing Mode Mockup */}
                          {activeTool === 'draw' && (
                             <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 50 }}>
                               <path d="M 40% 30% Q 45% 25% 50% 30% T 60% 40%" stroke="#ef4444" strokeWidth="3" fill="transparent" />
                               <text x="62%" y="42%" fill="#ef4444" fontSize="14" fontWeight="bold">Lésion C12</text>
                             </svg>
                          )}

                          {/* AI Overlay Mockup */}
                          {showAI && activeImage && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center" style={{ transform: `rotate(${rotation}deg)` }}>
                               {activeImage.title.includes('Panoramique') ? (
                                 <div className="w-1/4 h-1/4 border-2 border-primary animate-pulse absolute" style={{ top: '30%', left: '40%', boxShadow: '0 0 20px rgba(var(--primary),0.5) inset' }}>
                                   <span className="absolute -top-6 left-0 bg-primary text-primary-foreground text-[10px] font-mono px-1">Anomalie 87%</span>
                                 </div>
                               ) : (
                                 <div className="w-1/5 h-1/5 border-2 border-amber-500 animate-pulse absolute" style={{ top: '60%', left: '20%', boxShadow: '0 0 20px rgba(var(--amber-500),0.5) inset' }}>
                                   <span className="absolute -top-6 left-0 bg-amber-500 text-amber-950 text-[10px] font-mono px-1 font-bold">Lésion 94%</span>
                                 </div>
                               )}
                            </div>
                          )}
                        </div>
                      </TransformComponent>
                    </>
                  )}
                </TransformWrapper>
                </div>

                {/* Compare Viewport */}
                {compareImage && (
                  <div className="flex-1 relative border-l border-white/10 flex flex-col bg-[#050505]">
                    <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-start z-20 pointer-events-none">
                      <div className="text-amber-400 font-mono text-xs tracking-wider space-y-1 drop-shadow-md">
                        <p>COMPARE MODE</p>
                        <p>SCAN: {compareImage.title.toUpperCase()}</p>
                      </div>
                      <div className="text-right text-amber-400 font-mono text-xs tracking-wider space-y-1 drop-shadow-md">
                        <p>{compareImage.date}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="absolute top-4 right-4 z-30 text-white hover:bg-red-500/20 hover:text-red-400 rounded-full bg-black/40 backdrop-blur-md border border-white/10" onClick={() => setCompareImageId(null)}>
                      <X className="size-5" />
                    </Button>

                    <TransformWrapper initialScale={1} minScale={0.5} maxScale={8} centerOnInit wheel={{ step: 0.1 }}>
                      <TransformComponent wrapperStyle={{ width: "100%", height: "100%", cursor: 'grab' }} contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                         <img src={compareImage.url} alt={compareImage.title} className="max-h-full max-w-full object-contain select-none shadow-2xl" draggable={false} />
                      </TransformComponent>
                    </TransformWrapper>
                  </div>
                )}
              </div>

              {/* Right Sidebar - Sliders */}
              <div className="w-64 bg-[#0a0a0a] border-l border-white/10 p-5 flex flex-col z-20">
                <h3 className="text-white/80 font-medium text-sm mb-6 flex items-center gap-2 uppercase tracking-wider">
                  <Settings2 className="size-4 text-primary" /> Réglages Image
                </h3>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-white/60 flex items-center gap-2"><Sun className="size-3" /> Luminosité</label>
                      <span className="text-xs text-white/90 font-mono">{brightness}%</span>
                    </div>
                    <Slider value={[brightness]} min={20} max={200} step={1} onValueChange={(v) => setBrightness(v[0] || 100)} className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary" />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-white/60 flex items-center gap-2"><Contrast className="size-3" /> Contraste</label>
                      <span className="text-xs text-white/90 font-mono">{contrast}%</span>
                    </div>
                    <Slider value={[contrast]} min={50} max={250} step={1} onValueChange={(v) => setContrast(v[0] || 100)} className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary" />
                  </div>
                </div>

                <div className="mt-auto bg-primary/10 rounded-lg p-3 border border-primary/20">
                  <div className="flex items-center gap-2 text-primary font-medium text-sm mb-1">
                    <Sparkles className="size-4" /> Sanovia AI Ready
                  </div>
                  <p className="text-[10px] text-primary/70 leading-relaxed">
                    Cliquez sur l'icône IA à gauche pour détecter automatiquement les lésions, caries ou anomalies.
                  </p>
                </div>

                <div className="mt-6 border-t border-white/10 pt-6">
                  <h3 className="text-white/80 font-medium text-sm mb-4 flex items-center gap-2 uppercase tracking-wider">
                    <SplitSquareHorizontal className="size-4 text-primary" /> Mode Comparaison
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {images.filter(img => img.id !== activeImage?.id).length === 0 ? (
                      <p className="text-xs text-white/40 italic">Aucune autre image disponible pour comparaison.</p>
                    ) : (
                      images.filter(img => img.id !== activeImage?.id).map(img => (
                        <div 
                          key={img.id}
                          onClick={() => setCompareImageId(compareImageId === img.id ? null : img.id)}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${compareImageId === img.id ? 'bg-primary/20 border border-primary/50' : 'bg-white/5 hover:bg-white/10'}`}
                        >
                          <img src={img.url} className="size-8 rounded object-cover" />
                          <div className="overflow-hidden">
                            <p className="text-xs text-white font-medium truncate">{img.title}</p>
                            <p className="text-[10px] text-white/50">{img.date}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

            </div>
            </TooltipProvider>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
