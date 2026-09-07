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
import { ProjectDashboard } from './components/ProjectDashboard';
import { Toast, type ToastMessage } from './components/Toast';
import { executeInpainting } from './utils/inpaintingEngine';
import { executeStyleTransfer } from './utils/styleEngine';
import type { EditorMode, EditHistoryItem, InferenceProgress } from './types';
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

  // Style Transfer State
  const [selectedStyleId, setSelectedStyleId] = useState<string>('cyberpunk');
  const [showComparison, setShowComparison] = useState<boolean>(false);
  const [hasAppliedStyle, setHasAppliedStyle] = useState<boolean>(false);

  // View Mode State
  const [viewMode, setViewMode] = useState<'editor' | 'projects'>('editor');

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
      setStrokes([]);
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
      setStrokes([]);
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
      setActiveImage(previousState.imageBlobUrl);
      setHistory((prev) => prev.slice(0, -1));
      setStrokes([]);
      setErrorMessage(null);
      setShowComparison(false);
      addToast('info', `Reverted: ${previousState.action}`);
    }
  };

  const handleExport = () => {
    if (!activeImage) return;
    const a = document.createElement('a');
    a.href = activeImage;
    a.download = `lumen-edit-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    addToast('success', 'HD Image exported to downloads');
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
        }
      );

      setHistory((prev) => [...prev, historyItem]);
      setActiveImage(result.resultDataUrl);
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
        }
      );

      setHistory((prev) => [...prev, historyItem]);
      setActiveImage(result.resultDataUrl);
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
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6">
        {viewMode === 'projects' ? (
          <ProjectDashboard addToast={addToast} />
        ) : !activeImage ? (
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
