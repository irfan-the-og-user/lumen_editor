import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { UploadDropzone } from './components/UploadDropzone';
import { CanvasWorkspace } from './components/CanvasWorkspace';
import { EditorToolbar } from './components/EditorToolbar';
import { InpaintControls } from './components/InpaintControls';
import { StyleControls } from './components/StyleControls';
import { AdjustControls } from './components/AdjustControls';
import { ComparisonSlider } from './components/ComparisonSlider';
import { ArchitectureModal } from './components/ArchitectureModal';
import { Toast, type ToastMessage } from './components/Toast';
import { executeInpainting } from './utils/inpaintingEngine';
import { executeStyleTransfer } from './utils/styleEngine';
import { renderAdjustedImage, dataUrlToObjectUrl } from './utils/canvasUtils';
import type { EditorMode, EditHistoryItem, ImageAdjustments, InferenceProgress } from './types';
import type { Stroke } from './utils/canvasUtils';

const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  filterIntensity: 100
};

export function App() {
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [initialBaseImage, setInitialBaseImage] = useState<string | null>(null);
  const [mode, setMode] = useState<EditorMode>('inpaint');
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [brushSize, setBrushSize] = useState<number>(32);
  const [history, setHistory] = useState<EditHistoryItem[]>([]);
  const [redoStack, setRedoStack] = useState<EditHistoryItem[]>([]);
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(DEFAULT_ADJUSTMENTS);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<InferenceProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [lastEngineUsed, setLastEngineUsed] = useState<'huggingface' | 'edge-client' | null>(null);
  const [hfApiKey, setHfApiKey] = useState<string>('');

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

  const handleImageSelect = (fileOrUrl: File | string) => {
    if (typeof fileOrUrl === 'string') {
      setActiveImage(fileOrUrl);
      setInitialBaseImage(fileOrUrl);
      setHistory([]);
      setRedoStack([]);
      setStrokes([]);
      setAdjustments(DEFAULT_ADJUSTMENTS);
      setErrorMessage(null);
      setLastLatencyMs(null);
      setHasAppliedStyle(false);
      setShowComparison(false);
      addToast('success', 'Image loaded to canvas');
    } else {
      const url = URL.createObjectURL(fileOrUrl);
      setActiveImage(url);
      setInitialBaseImage(url);
      setHistory([]);
      setRedoStack([]);
      setStrokes([]);
      setAdjustments(DEFAULT_ADJUSTMENTS);
      setErrorMessage(null);
      setLastLatencyMs(null);
      setHasAppliedStyle(false);
      setShowComparison(false);
      addToast('success', 'Image uploaded successfully');
    }
  };

  const handleReset = () => {
    setActiveImage(null);
    setInitialBaseImage(null);
    setStrokes([]);
    setHistory([]);
    setRedoStack([]);
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setErrorMessage(null);
    setProgress(null);
    setLastLatencyMs(null);
    setHasAppliedStyle(false);
    setShowComparison(false);
    addToast('info', 'Canvas reset');
  };

  const handleUndoLastAction = () => {
    if (history.length > 0) {
      const previousState = history[history.length - 1];
      if (activeImage) {
        setRedoStack((prev) => [
          ...prev,
          {
            id: `redo-${Date.now()}`,
            timestamp: Date.now(),
            action: 'Undo',
            imageBlobUrl: activeImage,
            adjustments: { ...adjustments }
          }
        ]);
      }
      setActiveImage(previousState.imageBlobUrl);
      if (previousState.adjustments) {
        setAdjustments(previousState.adjustments);
      } else {
        setAdjustments(DEFAULT_ADJUSTMENTS);
      }
      setHistory((prev) => prev.slice(0, -1));
      setStrokes([]);
      setErrorMessage(null);
      setShowComparison(false);
      addToast('info', `Reverted: ${previousState.action}`);
    }
  };

  const handleRedoAction = () => {
    if (redoStack.length > 0) {
      const nextState = redoStack[redoStack.length - 1];
      if (activeImage) {
        setHistory((prev) => [
          ...prev,
          {
            id: `hist-${Date.now()}`,
            timestamp: Date.now(),
            action: 'Redo',
            imageBlobUrl: activeImage,
            adjustments: { ...adjustments }
          }
        ]);
      }
      setActiveImage(nextState.imageBlobUrl);
      if (nextState.adjustments) {
        setAdjustments(nextState.adjustments);
      }
      setRedoStack((prev) => prev.slice(0, -1));
      addToast('info', 'Redo edit applied');
    }
  };

  const handleCommitAdjustments = async () => {
    if (!activeImage) return;
    try {
      setIsProcessing(true);
      const newObjectUrl = await renderAdjustedImage(activeImage, adjustments);
      const historyItem: EditHistoryItem = {
        id: `hist-${Date.now()}`,
        timestamp: Date.now(),
        action: 'Viewport Adjustments',
        imageBlobUrl: activeImage,
        adjustments: { ...adjustments }
      };
      setHistory((prev) => [...prev, historyItem]);
      setRedoStack([]);
      setActiveImage(newObjectUrl);
      setAdjustments(DEFAULT_ADJUSTMENTS);
      addToast('success', 'Adjustments committed to memory');
    } catch (err) {
      console.error('Failed to commit adjustments:', err);
      addToast('error', 'Failed to save adjustments');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async () => {
    if (!activeImage) return;

    try {
      setIsProcessing(true);
      addToast('info', 'Preparing full-resolution HD export...');

      let exportUrl = activeImage;

      // Defer full-resolution cloud requests until explicit final export
      if (hfApiKey && hfApiKey.trim().length > 5 && mode === 'style') {
        try {
          const response = await fetch('/api/style-transfer', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${hfApiKey.trim()}`
            },
            body: JSON.stringify({
              image: initialBaseImage || activeImage,
              styleId: selectedStyleId
            })
          });
          if (response.ok) {
            const data = await response.json();
            if (data.image) {
              exportUrl = dataUrlToObjectUrl(data.image);
              addToast('success', 'Full-resolution cloud export complete!');
            }
          }
        } catch (e) {
          console.warn('Cloud export request failed, falling back to local full-res pipeline:', e);
        }
      } else if (
        adjustments.brightness !== 100 ||
        adjustments.contrast !== 100 ||
        adjustments.saturation !== 100
      ) {
        exportUrl = await renderAdjustedImage(activeImage, adjustments);
      }

      const a = document.createElement('a');
      a.href = exportUrl;
      a.download = `lumen-edit-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addToast('success', 'HD Image exported to downloads');
    } catch (err) {
      console.error('Export error:', err);
      addToast('error', 'HD export failed');
    } finally {
      setIsProcessing(false);
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
        undefined, // Defer cloud requests until export to guarantee zero network traffic during active editing
        (step, percentage) => {
          setProgress({ step, percentage, subtext: 'Synthesizing edge texture' });
        }
      );

      const objectUrl = dataUrlToObjectUrl(result.resultDataUrl);
      setHistory((prev) => [...prev, historyItem]);
      setRedoStack([]);
      setActiveImage(objectUrl);
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
        imageBlobUrl: activeImage,
        styleId: selectedStyleId
      };

      const result = await executeStyleTransfer(
        activeImage,
        selectedStyleId,
        undefined, // Defer cloud calls until final HD export to guarantee 0 network traffic during active previewing
        (step, percentage) => {
          setProgress({ step, percentage, subtext: 'Applying style shader' });
        }
      );

      const objectUrl = dataUrlToObjectUrl(result.resultDataUrl);
      setHistory((prev) => [...prev, historyItem]);
      setRedoStack([]);
      setActiveImage(objectUrl);
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
              onRedoAction={handleRedoAction}
              onExport={handleExport}
              hasHistory={history.length > 0}
              hasRedo={redoStack.length > 0}
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
                adjustments={adjustments}
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

            {/* Feature 3 Controls: Viewport Interactive Sliders */}
            {mode === 'adjust' && (
              <AdjustControls
                adjustments={adjustments}
                onAdjustmentsChange={setAdjustments}
                onResetAdjustments={() => setAdjustments(DEFAULT_ADJUSTMENTS)}
                onCommitAdjustments={handleCommitAdjustments}
                isProcessing={isProcessing}
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
