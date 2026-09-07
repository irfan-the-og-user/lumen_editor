import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { UploadDropzone } from './components/UploadDropzone';
import { CanvasWorkspace } from './components/CanvasWorkspace';
import { EditorToolbar } from './components/EditorToolbar';
import { InpaintControls } from './components/InpaintControls';
import { StyleControls } from './components/StyleControls';
import { ComparisonSlider } from './components/ComparisonSlider';
import { ArchitectureModal } from './components/ArchitectureModal';
import { Toast, type ToastMessage } from './components/Toast';
import { executeInpainting } from './utils/inpaintingEngine';
import { executeStyleTransfer } from './utils/styleEngine';
import { extractICCProfile, injectICCProfile, DEFAULT_DISPLAY_P3_ICC } from './utils/iccUtils';
import type { EditorMode, EditHistoryItem, InferenceProgress, ColorSpace, ICCProfileData } from './types';
import type { Stroke } from './utils/canvasUtils';

export function App() {
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [initialBaseImage, setInitialBaseImage] = useState<string | null>(null);
  const [mode, setMode] = useState<EditorMode>('inpaint');
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [brushSize, setBrushSize] = useState<number>(32);
  const [history, setHistory] = useState<EditHistoryItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<InferenceProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [lastEngineUsed, setLastEngineUsed] = useState<'huggingface' | 'edge-client' | null>(null);
  const [hfApiKey, setHfApiKey] = useState<string>('');

  // Adaptive Color Space & ICC Metadata State
  const [colorSpace, setColorSpace] = useState<ColorSpace>('srgb');
  const [iccProfile, setIccProfile] = useState<ICCProfileData | null>(null);

  // Style Transfer State
  const [selectedStyleId, setSelectedStyleId] = useState<string>('cyberpunk');
  const [showComparison, setShowComparison] = useState<boolean>(false);
  const [hasAppliedStyle, setHasAppliedStyle] = useState<boolean>(false);

  // Modals and Toasts
  const [isArchitectureOpen, setIsArchitectureOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', text: string) => {
    const newToast: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random()}`,
      type,
      text
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleImageSelect = async (fileOrUrl: File | string) => {
    setHistory([]);
    setStrokes([]);
    setErrorMessage(null);
    setLastLatencyMs(null);
    setHasAppliedStyle(false);
    setShowComparison(false);

    if (typeof fileOrUrl === 'string') {
      setActiveImage(fileOrUrl);
      setInitialBaseImage(fileOrUrl);
      addToast('success', 'Image loaded to canvas');

      try {
        const res = await fetch(fileOrUrl);
        const ab = await res.arrayBuffer();
        const extracted = extractICCProfile(ab);
        if (extracted) {
          setIccProfile(extracted);
          setColorSpace(extracted.colorSpace);
          if (extracted.isDisplayP3) {
            addToast('info', 'Display P3 Wide Gamut profile extracted');
          }
        } else if (fileOrUrl.toLowerCase().includes('p3') || fileOrUrl.toLowerCase().includes('display')) {
          const p3Profile: ICCProfileData = {
            rawBytes: DEFAULT_DISPLAY_P3_ICC,
            profileName: 'Display P3',
            colorSpace: 'display-p3',
            isDisplayP3: true
          };
          setIccProfile(p3Profile);
          setColorSpace('display-p3');
          addToast('info', 'Display P3 Wide Gamut workspace initialized');
        } else {
          setIccProfile(null);
          setColorSpace('srgb');
        }
      } catch (err) {
        console.warn('Could not parse ICC profile from URL:', err);
        setIccProfile(null);
        setColorSpace('srgb');
      }
    } else {
      const url = URL.createObjectURL(fileOrUrl);
      setActiveImage(url);
      setInitialBaseImage(url);
      addToast('success', 'Image uploaded successfully');

      try {
        const ab = await fileOrUrl.arrayBuffer();
        const extracted = extractICCProfile(ab);
        if (extracted) {
          setIccProfile(extracted);
          setColorSpace(extracted.colorSpace);
          if (extracted.isDisplayP3) {
            addToast('info', 'Display P3 Wide Gamut profile extracted from upload');
          }
        } else {
          const isP3Name = fileOrUrl.name.toLowerCase().includes('p3') || fileOrUrl.name.toLowerCase().includes('display');
          if (isP3Name) {
            const p3Profile: ICCProfileData = {
              rawBytes: DEFAULT_DISPLAY_P3_ICC,
              profileName: 'Display P3',
              colorSpace: 'display-p3',
              isDisplayP3: true
            };
            setIccProfile(p3Profile);
            setColorSpace('display-p3');
            addToast('info', 'Display P3 Wide Gamut workspace initialized');
          } else {
            setIccProfile(null);
            setColorSpace('srgb');
          }
        }
      } catch (err) {
        console.warn('Could not extract ICC profile from File:', err);
        setIccProfile(null);
        setColorSpace('srgb');
      }
    }
  };

  const handleReset = () => {
    setActiveImage(null);
    setInitialBaseImage(null);
    setStrokes([]);
    setHistory([]);
    setErrorMessage(null);
    setProgress(null);
    setLastLatencyMs(null);
    setHasAppliedStyle(false);
    setShowComparison(false);
    setIccProfile(null);
    setColorSpace('srgb');
    addToast('info', 'Canvas reset');
  };

  const handleUndoLastAction = () => {
    if (history.length > 0) {
      const previousState = history[history.length - 1];
      setActiveImage(previousState.imageBlobUrl);
      setHistory((prev) => prev.slice(0, -1));
      setStrokes([]);
      setErrorMessage(null);
      setShowComparison(false);
      addToast('info', `Reverted: ${previousState.action}`);
    }
  };

  const handleExport = async (format: 'png' | 'jpeg' = 'png') => {
    if (!activeImage) return;

    const exportStartTime = performance.now();

    try {
      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      let rawBuffer: Uint8Array;

      if (activeImage.startsWith('data:')) {
        const parts = activeImage.split(',');
        const bstr = atob(parts[1]);
        rawBuffer = new Uint8Array(bstr.length);
        for (let i = 0; i < bstr.length; i++) {
          rawBuffer[i] = bstr.charCodeAt(i);
        }
      } else {
        const res = await fetch(activeImage);
        const ab = await res.arrayBuffer();
        rawBuffer = new Uint8Array(ab);
      }

      const profileToInject = iccProfile?.rawBytes || (colorSpace === 'display-p3' ? DEFAULT_DISPLAY_P3_ICC : null);

      let finalBytes = rawBuffer;
      if (profileToInject) {
        finalBytes = injectICCProfile(
          rawBuffer,
          mimeType,
          profileToInject,
          iccProfile?.profileName || 'Display P3'
        );
      }

      const latency = Math.round(performance.now() - exportStartTime);

      const blob = new Blob([finalBytes as unknown as BlobPart], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `lumen-edit-${Date.now()}.${format === 'jpeg' ? 'jpg' : 'png'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

      if (profileToInject) {
        addToast('success', `HD Image exported with preserved ${colorSpace === 'display-p3' ? 'Display P3' : 'ICC'} profile (${latency}ms)`);
      } else {
        addToast('success', `HD Image exported (${latency}ms)`);
      }
    } catch (err) {
      console.error('Export error:', err);
      addToast('error', 'Failed to export image.');
    }
  };

  // Feature 1: Object Removal Action
  const handleRemoveObject = async () => {
    if (!activeImage) return;
    if (strokes.length === 0) {
      setErrorMessage('Please mark an unwanted object by brushing over it on the canvas first.');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage(null);
      setProgress({ step: 'Initializing neural pipeline...', percentage: 10, subtext: 'Preparing image tensors' });

      const historyItem: EditHistoryItem = {
        id: `hist-${Date.now()}`,
        timestamp: Date.now(),
        action: 'Neural Object Removal',
        imageBlobUrl: activeImage
      };

      const result = await executeInpainting(
        activeImage,
        strokes,
        hfApiKey,
        (step, percentage) => {
          setProgress({ step, percentage, subtext: 'Synthesizing edge texture' });
        },
        colorSpace
      );

      // Re-associate ICC profile metadata if cloud pipeline returned fresh image raster
      let resultRaster = result.resultDataUrl;
      const profileToInject = iccProfile?.rawBytes || (colorSpace === 'display-p3' ? DEFAULT_DISPLAY_P3_ICC : null);
      if (profileToInject && result.engineUsed === 'huggingface') {
        try {
          const res = await fetch(result.resultDataUrl);
          const ab = await res.arrayBuffer();
          const injected = injectICCProfile(new Uint8Array(ab), 'image/png', profileToInject, iccProfile?.profileName || 'Display P3');
          const blob = new Blob([injected as unknown as BlobPart], { type: 'image/png' });
          resultRaster = URL.createObjectURL(blob);
        } catch (e) {
          console.warn('Could not re-associate ICC profile with cloud output:', e);
        }
      }

      setHistory((prev) => [...prev, historyItem]);
      setActiveImage(resultRaster);
      setStrokes([]);
      setLastLatencyMs(result.latencyMs);
      setLastEngineUsed(result.engineUsed);
      addToast('success', `Object removed in ${result.latencyMs}ms`);
    } catch (err: any) {
      console.error('Inpainting error:', err);
      setErrorMessage(err?.message || 'Failed to remove object. Please try again.');
      addToast('error', 'Object removal failed');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  // Feature 2: Style Transfer Action
  const handleApplyStyle = async () => {
    if (!activeImage) return;

    try {
      setIsProcessing(true);
      setErrorMessage(null);
      setProgress({ step: 'Loading neural shader...', percentage: 10, subtext: 'Mapping color matrix tensors' });

      const historyItem: EditHistoryItem = {
        id: `hist-${Date.now()}`,
        timestamp: Date.now(),
        action: 'Neural Style Transfer',
        imageBlobUrl: activeImage
      };

      const result = await executeStyleTransfer(
        activeImage,
        selectedStyleId,
        hfApiKey,
        (step, percentage) => {
          setProgress({ step, percentage, subtext: 'Applying style shader' });
        },
        colorSpace
      );

      // Re-associate ICC profile metadata if cloud pipeline returned fresh image raster
      let resultRaster = result.resultDataUrl;
      const profileToInject = iccProfile?.rawBytes || (colorSpace === 'display-p3' ? DEFAULT_DISPLAY_P3_ICC : null);
      if (profileToInject && result.engineUsed === 'huggingface') {
        try {
          const res = await fetch(result.resultDataUrl);
          const ab = await res.arrayBuffer();
          const injected = injectICCProfile(new Uint8Array(ab), 'image/png', profileToInject, iccProfile?.profileName || 'Display P3');
          const blob = new Blob([injected as unknown as BlobPart], { type: 'image/png' });
          resultRaster = URL.createObjectURL(blob);
        } catch (e) {
          console.warn('Could not re-associate ICC profile with cloud output:', e);
        }
      }

      setHistory((prev) => [...prev, historyItem]);
      setActiveImage(resultRaster);
      setHasAppliedStyle(true);
      setShowComparison(true);
      setLastLatencyMs(result.latencyMs);
      setLastEngineUsed(result.engineUsed);
      addToast('success', `Style synthesized in ${result.latencyMs}ms`);
    } catch (err: any) {
      console.error('Style transfer error:', err);
      setErrorMessage(err?.message || 'Failed to apply style transfer.');
      addToast('error', 'Style synthesis failed');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-zinc-950 text-zinc-100 selection:bg-emerald-500/20 selection:text-emerald-300">
      <Navbar
        onReset={handleReset}
        hasActiveImage={!!activeImage}
        onOpenArchitecture={() => setIsArchitectureOpen(true)}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6">
        {!activeImage ? (
          <>
            <Hero />
            <section className="py-2 sm:py-4">
              <UploadDropzone onImageSelect={handleImageSelect} />
            </section>
          </>
        ) : (
          <div className="space-y-4">
            {/* Editor Top Navigation & Action Bar */}
            <EditorToolbar
              mode={mode}
              onModeChange={(m) => {
                setMode(m);
                setShowComparison(false);
              }}
              onReset={handleReset}
              onUndoLastAction={handleUndoLastAction}
              onExport={handleExport}
              hasHistory={history.length > 0}
              isProcessing={isProcessing}
            />

            {/* Display either Canvas Workspace or Interactive Comparison Slider */}
            {mode === 'style' && showComparison && initialBaseImage ? (
              <ComparisonSlider
                originalImage={initialBaseImage}
                processedImage={activeImage}
              />
            ) : (
              <CanvasWorkspace
                imageUrl={activeImage}
                strokes={strokes}
                onStrokesChange={setStrokes}
                brushSize={brushSize}
                onBrushSizeChange={setBrushSize}
                isDrawingEnabled={mode === 'inpaint'}
                isProcessing={isProcessing}
                colorSpace={colorSpace}
              />
            )}

            {/* Feature 1 Controls: Object Removal */}
            {mode === 'inpaint' && (
              <InpaintControls
                onRemoveObject={handleRemoveObject}
                strokeCount={strokes.length}
                isProcessing={isProcessing}
                progress={progress}
                lastLatencyMs={lastLatencyMs}
                lastEngineUsed={lastEngineUsed}
                hfApiKey={hfApiKey}
                onHfApiKeyChange={setHfApiKey}
                errorMessage={errorMessage}
              />
            )}

            {/* Feature 2 Controls: Style Transfer */}
            {mode === 'style' && (
              <StyleControls
                selectedStyleId={selectedStyleId}
                onSelectStyleId={setSelectedStyleId}
                onApplyStyle={handleApplyStyle}
                isProcessing={isProcessing}
                progress={progress}
                lastLatencyMs={lastLatencyMs}
                lastEngineUsed={lastEngineUsed}
                hasStyledImage={hasAppliedStyle}
                showComparison={showComparison}
                onToggleComparison={setShowComparison}
              />
            )}
          </div>
        )}
      </main>

      {/* Architecture System Modal */}
      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />

      {/* Toast Feedback System */}
      <Toast toasts={toasts} onDismiss={removeToast} />

      {/* Mobile-Safe Footer */}
      <footer className="w-full border-t border-zinc-900 bg-zinc-950/60 py-4 px-4 text-center text-xs font-mono text-zinc-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Lumen AI • Inter IIT Tech Meet 14.0 Prototype</span>
          <span className="text-zinc-400">Zero GPU Hardware Lock-in • Mobile Edge AI Pipeline</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
