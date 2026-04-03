import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { useRef, useState, useCallback } from 'react';

export const useFFmpeg = () => {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const ffmpegRef = useRef(new FFmpeg());
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (loaded || loading) return;
    setLoading(true);
    try {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      const ffmpeg = ffmpegRef.current;
      
      ffmpeg.on('log', ({ message }) => {
        setLogs(prev => [...prev.slice(-10), message]);
        console.log(message);
      });

      ffmpeg.on('progress', ({ progress }) => {
        setProgress(Math.round(progress * 100));
      });

      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      setLoaded(true);
    } catch (err) {
      console.error('Failed to load FFmpeg', err);
    } finally {
      setLoading(false);
    }
  }, [loaded, loading]);

  return { 
    load, 
    loaded, 
    loading,
    ffmpeg: ffmpegRef.current, 
    progress,
    logs,
    setProgress
  };
};
