import { useState, useRef, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const { load, loaded, ffmpeg, progress, logs, setProgress } = useFFmpeg();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [outputType, setOutputType] = useState<'gif' | 'webp'>('gif');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [outputFileName, setOutputFileName] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Settings
  const [fps, setFps] = useState(15);
  const [width, setScaleWidth] = useState(480);
  const [quality, setQuality] = useState('balanced'); // high (HD), balanced, fast

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Load FFmpeg on mount
    load();
  }, [load]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setResultUrl(null);
      setError(null);
      // Prepare output filename
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      setOutputFileName(`${baseName}.${outputType}`);
    }
  };

  // Sync filename when output type changes
  useEffect(() => {
    if (videoFile) {
      const baseName = videoFile.name.replace(/\.[^/.]+$/, "");
      setOutputFileName(`${baseName}.${outputType}`);
    }
  }, [outputType, videoFile]);

  const convertToOutput = async () => {
    if (!videoFile || !ffmpeg) return;

    setIsConverting(true);
    setProgress(0);
    setError(null);

    const inputName = 'input.mp4';
    const outputName = outputType === 'gif' ? 'output.gif' : 'output.webp';
    const paletteName = 'palette.png';

    try {
      // Write file to FFmpeg FS
      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

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
          // Balanced GIF: Quality/Size Optimization
          // Bayer dithering is much more compressible than error-diffusion (floyd_steinberg)
          // 224 colors is often indistinguishable from 256 but saves on palette and dithering overhead
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
        // WebP Conversion
        // High: Ultra High Quality (q:v 95, compression_level 6)
        // Balanced: Standard High Quality (q:v 75, compression_level 4)
        // Fast: Efficient Quality (q:v 50, compression_level 2)
        const q = quality === 'high' ? '95' : quality === 'balanced' ? '75' : '50';
        const method = quality === 'high' ? '6' : quality === 'balanced' ? '4' : '2'; 
        
        await ffmpeg.exec([
          '-i', inputName,
          '-vcodec', 'libwebp',
          '-filter_complex', `fps=${fps},scale=${width}:-1:flags=lanczos`,
          '-lossless', '0',
          '-q:v', q,
          '-compression_level', method,
          '-preset', 'drawing', // Good for many use cases, but libwebp handles it well
          '-loop', '0',
          '-y', outputName
        ]);
      }

      // Read result
      const data = await ffmpeg.readFile(outputName);
      if (typeof data !== 'string') {
        const uint8 = new Uint8Array(data);
        const mime = outputType === 'gif' ? 'image/gif' : 'image/webp';
        const blob = new Blob([uint8], { type: mime });
        const url = URL.createObjectURL(blob);
        setResultUrl(url);
      }
    } catch (err) {
      console.error(err);
      setError('Conversion failed. Please try a different file.');
    } finally {
      setIsConverting(false);
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
            High-definition GIF and WebP conversion in your browser.
          </p>
        </motion.div>
      </header>

      <main>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px', alignItems: 'start' }}>
          
          {/* Left Column: Visual Area */}
          <section>
            <AnimatePresence mode="wait">
              {!videoFile ? (
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
                    accept="video/mp4,video/x-m4v,video/*" 
                    onChange={handleFileChange} 
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                  />
                  <div style={{ padding: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', marginBottom: '20px' }}>
                    <FileVideo size={48} color="var(--text-muted)" />
                  </div>
                  <h3>Drop your MP4 here</h3>
                  <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>or click to browse files</p>
                </motion.div>
              ) : (
                <motion.div 
                  key="preview"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card"
                  style={{ padding: '20px', position: 'relative' }}
                >
                  {resultUrl ? (
                    <div style={{ textAlign: 'center' }}>
                      <img src={resultUrl} alt="Result" style={{ maxWidth: '100%', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }} />
                      <div style={{ marginTop: '24px', display: 'flex', gap: '16px', justifyContent: 'center' }}>
                        <a href={resultUrl} download={outputFileName} className="btn-primary">
                          <Download size={20} /> Download {outputType.toUpperCase()}
                        </a>
                        <button onClick={() => setVideoFile(null)} className="btn-primary" style={{ background: 'rgba(255,255,255,0.1)', boxShadow: 'none' }}>
                          Start Over
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <video 
                        ref={videoRef}
                        src={URL.createObjectURL(videoFile)} 
                        controls 
                        style={{ width: '100%', borderRadius: '12px' }} 
                      />
                      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                           <FileVideo size={16} color="var(--primary)" />
                           <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                         </div>
                         <button onClick={() => setVideoFile(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem' }}>
                           Remove
                         </button>
                      </div>
                    </>
                  )}

                  {isConverting && (
                    <div style={{ 
                      position: 'absolute', 
                      inset: 0, 
                      background: 'rgba(0,0,0,0.7)', 
                      borderRadius: '20px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      backdropFilter: 'blur(4px)'
                    }}>
                      <div style={{ width: '200px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', marginBottom: '20px' }}>
                        <motion.div 
                          style={{ height: '100%', background: 'var(--gradient-primary)' }} 
                          animate={{ width: `${progress}%` }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Loader2 className="animate-spin" size={24} color="var(--primary)" />
                        <h3 style={{ fontWeight: 500 }}>Brewing HD GIF... {progress}%</h3>
                      </div>
                      <p style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {logs[logs.length - 1]}
                      </p>
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
                      onClick={convertToOutput} 
                      disabled={!videoFile || isConverting}
                      className="btn-primary"
                      style={{ width: '100%', justifyContent: 'center', height: '50px' }}
                    >
                      {isConverting ? (
                        <>Processing...</>
                      ) : (
                        <>
                          <Play size={20} fill="currentColor" /> Convert Now
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Status / Log Mini panel */}
            {videoFile && !isConverting && !resultUrl && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: '20px', padding: '16px', background: 'rgba(34, 211, 238, 0.05)', border: '1px solid rgba(34, 211, 238, 0.2)', borderRadius: '16px', display: 'flex', gap: '12px' }}
              >
                <CheckCircle2 color="var(--accent)" size={20} style={{ flexShrink: 0 }} />
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Video loaded and ready for conversion. High precision mode will preserve maximum color range.
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
      `}</style>
    </div>
  );
}

export default App;
