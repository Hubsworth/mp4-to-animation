import { useState, useEffect } from 'react';
import { useFFmpeg } from './hooks/useFFmpeg';
import { fetchFile } from '@ffmpeg/util';
import { 
  FileVideo, 
  Download, 
  Settings, 
  Zap, 
  Loader2, 
  Play, 
  CheckCircle2,
  AlertCircle,
  Files,
  X,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConversionResult {
  url: string;
  name: string;
  type: 'gif' | 'webp';
}

function App() {
  const { load, loaded, ffmpeg, progress, setProgress } = useFFmpeg();
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [outputType, setOutputType] = useState<'gif' | 'webp'>('gif');
  const [results, setResults] = useState<ConversionResult[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Settings
  const [fps, setFps] = useState(15);
  const [width, setScaleWidth] = useState(480);
  const [quality, setQuality] = useState('balanced'); // high (HD), balanced, fast

  useEffect(() => {
    load();
  }, [load]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setVideoFiles(prev => [...prev, ...files]);
      setError(null);
      // Reset input value to allow selecting same files again if needed
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setVideoFiles(prev => prev.filter((_, i) => i !== index));
    if (videoFiles.length === 1) {
      setResults([]);
    }
  };

  const clearAll = () => {
    setVideoFiles([]);
    setResults([]);
    setError(null);
  };

  const convertBatch = async () => {
    if (videoFiles.length === 0 || !ffmpeg) return;

    setIsConverting(true);
    setResults([]);
    setError(null);

    try {
      for (let i = 0; i < videoFiles.length; i++) {
        setCurrentProcessingIndex(i);
        setProgress(0);
        
        const file = videoFiles[i];
        const inputName = `input_${i}.mp4`;
        const outputSuffix = outputType === 'gif' ? 'gif' : 'webp';
        const outputName = `output_${i}.${outputSuffix}`;
        const paletteName = `palette_${i}.png`;
        const finalFileName = `${file.name.replace(/\.[^/.]+$/, "")}.${outputSuffix}`;

        // Write file to FFmpeg FS
        await ffmpeg.writeFile(inputName, await fetchFile(file));

        if (outputType === 'gif') {
          if (quality === 'high') {
            await ffmpeg.exec([
              '-i', inputName,
              '-vf', `fps=${fps},scale=${width}:-1:flags=lanczos,palettegen=stats_mode=full`,
              '-y', paletteName
            ]);
            await ffmpeg.exec([
              '-i', inputName,
              '-i', paletteName,
              '-filter_complex', `fps=${fps},scale=${width}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=sierra2_4a:diff_mode=rectangle`,
              '-y', outputName
            ]);
          } else if (quality === 'balanced') {
            await ffmpeg.exec([
              '-i', inputName,
              '-vf', `fps=${fps},scale=${width}:-1:flags=lanczos,palettegen=stats_mode=diff:max_colors=224`,
              '-y', paletteName
            ]);
            await ffmpeg.exec([
              '-i', inputName,
              '-i', paletteName,
              '-filter_complex', `fps=${fps},scale=${width}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=1:diff_mode=rectangle`,
              '-y', outputName
            ]);
          } else {
            await ffmpeg.exec([
              '-i', inputName,
              '-vf', `fps=${fps},scale=${width}:-1:flags=lanczos`,
              '-y', outputName
            ]);
          }
        } else {
          const q = quality === 'high' ? '95' : quality === 'balanced' ? '75' : '50';
          const method = quality === 'high' ? '6' : quality === 'balanced' ? '4' : '2'; 
          
          await ffmpeg.exec([
            '-i', inputName,
            '-vcodec', 'libwebp',
            '-filter_complex', `fps=${fps},scale=${width}:-1:flags=lanczos`,
            '-lossless', '0',
            '-q:v', q,
            '-compression_level', method,
            '-preset', 'drawing',
            '-loop', '0',
            '-y', outputName
          ]);
        }

        const data = await ffmpeg.readFile(outputName);
        if (typeof data !== 'string') {
          const uint8 = new Uint8Array(data);
          const mime = outputType === 'gif' ? 'image/gif' : 'image/webp';
          const blob = new Blob([uint8], { type: mime });
          const url = URL.createObjectURL(blob);
          setResults(prev => [...prev, { url, name: finalFileName, type: outputType }]);
        }

        // Cleanup virtual files to save memory
        try {
          await ffmpeg.deleteFile(inputName);
          await ffmpeg.deleteFile(outputName);
          if (outputType === 'gif') await ffmpeg.deleteFile(paletteName);
        } catch (e) {
          console.warn('Cleanup failed', e);
        }
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during batch processing.');
    } finally {
      setIsConverting(false);
      setCurrentProcessingIndex(null);
    }
  };

  return (
    <div className="container">
      <header style={{ textAlign: 'center', marginBottom: '60px' }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '16px', marginBottom: '16px' }}>
            <Zap size={32} color="var(--primary)" />
          </div>
          <h1 style={{ fontSize: '3.5rem', marginBottom: '12px', background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            MP4 to Animation
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', fontWeight: 400 }}>
            High-definition Batch GIF and WebP conversion in your browser.
          </p>
        </motion.div>
      </header>

      <main>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px', alignItems: 'start' }}>
          
          {/* Left Column: Visual Area & List */}
          <section>
            <AnimatePresence mode="wait">
              {videoFiles.length === 0 ? (
                <motion.div 
                  key="dropzone"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-card"
                  style={{ 
                    height: '400px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    border: '2px dashed var(--border)',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  <input 
                    type="file" 
                    multiple
                    accept="video/mp4,video/x-m4v,video/*" 
                    onChange={handleFileChange} 
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                  />
                  <div style={{ padding: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', marginBottom: '20px' }}>
                    <Files size={48} color="var(--text-muted)" />
                  </div>
                  <h3>Drop your MP4s here</h3>
                  <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>or click to select multiple files</p>
                </motion.div>
              ) : (
                <motion.div 
                  key="batch-view"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card"
                  style={{ padding: '32px', minHeight: '400px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1.4rem' }}>Batch Queue ({videoFiles.length} files)</h3>
                    <button 
                      onClick={clearAll} 
                      disabled={isConverting}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}
                    >
                      <Trash2 size={16} /> Clear All
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
                    {videoFiles.map((file, idx) => {
                      const result = results.find(r => r.name.includes(file.name.replace(/\.[^/.]+$/, "")));
                      const isProcessing = currentProcessingIndex === idx;
                      
                      return (
                        <motion.div 
                          layout
                          key={`${file.name}-${idx}`}
                          style={{ 
                            padding: '16px', 
                            background: isProcessing ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.03)', 
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            border: isProcessing ? '1px solid var(--primary)' : '1px solid transparent'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', overflow: 'hidden' }}>
                            <div style={{ position: 'relative' }}>
                               <FileVideo size={24} color={result ? "var(--accent)" : isProcessing ? "var(--primary)" : "var(--text-muted)"} />
                               {result && <div style={{ position: 'absolute', top: -4, right: -4, background: 'var(--accent)', color: 'black', borderRadius: '50%', padding: '2px' }}><CheckCircle2 size={10} /></div>}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                              <p style={{ fontSize: '0.95rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</p>
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {result ? (
                              <a href={result.url} download={result.name} className="btn-primary" style={{ padding: '8px 12px', fontSize: '0.8rem', height: 'auto', background: 'var(--accent)', color: 'black' }}>
                                <Download size={14} /> Download
                              </a>
                            ) : isProcessing ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontSize: '0.85rem' }}>
                                <Loader2 size={16} className="animate-spin" />
                                {progress}%
                              </div>
                            ) : (
                              <button 
                                onClick={() => removeFile(idx)} 
                                disabled={isConverting}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                              >
                                <X size={18} />
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {!isConverting && results.length === 0 && (
                    <div style={{ marginTop: '32px', padding: '24px', border: '2px dashed var(--border)', borderRadius: '16px', textAlign: 'center', position: 'relative' }}>
                      <input 
                        type="file" 
                        multiple
                        accept="video/mp4,video/x-m4v,video/*" 
                        onChange={handleFileChange} 
                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                      />
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>+ Add more files to batch</p>
                    </div>
                  )}
                  
                  {isConverting && (
                     <div style={{ marginTop: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '8px' }}>
                           <span>Batch Progress</span>
                           <span>{Math.round(((currentProcessingIndex || 0) / videoFiles.length) * 100)}%</span>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                           <motion.div 
                              style={{ height: '100%', background: 'var(--gradient-primary)' }}
                              animate={{ width: `${((currentProcessingIndex || 0) / videoFiles.length) * 100}%` }}
                           />
                        </div>
                     </div>
                  )}

                  {results.length > 0 && !isConverting && (
                    <div style={{ marginTop: '32px', display: 'flex', gap: '16px' }}>
                       <button onClick={clearAll} className="btn-primary" style={{ flex: 1, background: 'rgba(255,255,255,0.1)', boxShadow: 'none' }}>
                         Start New Batch
                       </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Right Column: Controls */}
          <aside>
            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <Settings size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.2rem' }}>Precision Settings</h3>
              </div>

              {!loaded ? (
                <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                  <Loader2 className="animate-spin" style={{ margin: '0 auto 12px' }} color="var(--primary)" />
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Igniting Video Engine...</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Output Format</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => setOutputType('gif')}
                        style={{ 
                          flex: 1, 
                          padding: '10px', 
                          borderRadius: '8px', 
                          border: '1px solid', 
                          borderColor: outputType === 'gif' ? 'var(--primary)' : 'var(--border)',
                          background: outputType === 'gif' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                          color: outputType === 'gif' ? 'white' : 'var(--text-muted)',
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                         GIF
                      </button>
                      <button 
                        onClick={() => setOutputType('webp')}
                        style={{ 
                          flex: 1, 
                          padding: '10px', 
                          borderRadius: '8px', 
                          border: '1px solid', 
                          borderColor: outputType === 'webp' ? 'var(--primary)' : 'var(--border)',
                          background: outputType === 'webp' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                          color: outputType === 'webp' ? 'white' : 'var(--text-muted)',
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                         WebP
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Output FPS</label>
                    <select 
                      value={fps} 
                      onChange={(e) => setFps(Number(e.target.value))}
                      style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white' }}
                    >
                      <option value="10">Low Motion (10 fps)</option>
                      <option value="15">Standard (15 fps)</option>
                      <option value="24">Cinematic (24 fps)</option>
                      <option value="30">High (30 fps)</option>
                      <option value="40">Ultra (40 fps)</option>
                      <option value="60">Max Precision (60 fps)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Max Width (px)</label>
                    <input 
                      type="range" 
                      min="120" 
                      max="1080" 
                      step="40" 
                      value={width} 
                      onChange={(e) => setScaleWidth(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--primary)' }}
                    />
                    <div style={{ textAlign: 'right', fontSize: '0.8rem', marginTop: '4px', color: 'var(--accent)' }}>{width}px</div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Quality</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      <button 
                        onClick={() => setQuality('high')}
                        style={{ 
                          padding: '10px 4px', 
                          borderRadius: '8px', 
                          border: '1px solid', 
                          borderColor: quality === 'high' ? 'var(--primary)' : 'var(--border)',
                          background: quality === 'high' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                          color: quality === 'high' ? 'white' : 'var(--text-muted)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: quality === 'high' ? 600 : 400
                        }}
                      >
                         Precision
                      </button>
                      <button 
                        onClick={() => setQuality('balanced')}
                        style={{ 
                          padding: '10px 4px', 
                          borderRadius: '8px', 
                          border: '1px solid', 
                          borderColor: quality === 'balanced' ? 'var(--primary)' : 'var(--border)',
                          background: quality === 'balanced' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                          color: quality === 'balanced' ? 'white' : 'var(--text-muted)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: quality === 'balanced' ? 600 : 400
                        }}
                      >
                         Balanced
                      </button>
                      <button 
                        onClick={() => setQuality('fast')}
                        style={{ 
                          padding: '10px 4px', 
                          borderRadius: '8px', 
                          border: '1px solid', 
                          borderColor: quality === 'fast' ? 'var(--primary)' : 'var(--border)',
                          background: quality === 'fast' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                          color: quality === 'fast' ? 'white' : 'var(--text-muted)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: quality === 'fast' ? 600 : 400
                        }}
                      >
                         Fast
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: '12px' }}>
                    <button 
                      onClick={convertBatch} 
                      disabled={videoFiles.length === 0 || isConverting}
                      className="btn-primary"
                      style={{ width: '100%', justifyContent: 'center', height: '50px' }}
                    >
                      {isConverting ? (
                        <>Processing Batch...</>
                      ) : (
                        <>
                          <Play size={20} fill="currentColor" /> Convert {videoFiles.length > 1 ? `Batch (${videoFiles.length})` : 'Now'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Status / Log Mini panel */}
            {videoFiles.length > 0 && !isConverting && results.length === 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: '20px', padding: '16px', background: 'rgba(34, 211, 238, 0.05)', border: '1px solid rgba(34, 211, 238, 0.2)', borderRadius: '16px', display: 'flex', gap: '12px' }}
              >
                <CheckCircle2 color="var(--accent)" size={20} style={{ flexShrink: 0 }} />
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Batch ready. Shared settings will accelerate your workflow. HD precision mode is active for all files.
                </p>
              </motion.div>
            )}

            {error && (
              <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '16px', display: 'flex', gap: '12px' }}>
                <AlertCircle color="#ef4444" size={20} style={{ flexShrink: 0 }} />
                <p style={{ fontSize: '0.85rem', color: '#ef4444' }}>{error}</p>
              </div>
            )}
          </aside>
        </div>
      </main>

      <footer style={{ marginTop: '80px', textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.9rem', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }}></div>
            No Server Uploads
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--secondary)' }}></div>
            100% In-Browser
          </div>
        </div>
      </footer>
      
      <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        select:focus, input:focus {
          outline: none;
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 2px var(--primary-glow);
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.02);
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}</style>
    </div>
  );
}

export default App;
