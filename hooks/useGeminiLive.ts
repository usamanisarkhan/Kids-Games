import { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { MODEL_NAME, SYSTEM_INSTRUCTION } from '../constants';
import { decodeAudioData, createPcmBlob, base64ToUint8Array } from '../services/audioUtils';

interface UseGeminiLiveProps {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export const useGeminiLive = ({ onConnect, onDisconnect, onError }: UseGeminiLiveProps = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const connect = useCallback(async () => {
    if (isConnected || isConnecting) return;
    setIsConnecting(true);

    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("API_KEY not found in environment variables");
      }

      const ai = new GoogleGenAI({ apiKey });

      // Initialize Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      
      audioContextRef.current = outputCtx;
      inputAudioContextRef.current = inputCtx;
      nextStartTimeRef.current = 0;

      // Setup Microphone Input
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBlob = createPcmBlob(inputData);
        
        if (sessionPromiseRef.current) {
          sessionPromiseRef.current.then(session => {
            session.sendRealtimeInput({ media: pcmBlob });
          }).catch(err => console.error("Error sending audio:", err));
        }
      };

      source.connect(processor);
      processor.connect(inputCtx.destination);

      // Connect to Gemini Live
      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Connected");
            setIsConnected(true);
            setIsConnecting(false);
            onConnect?.();
          },
          onmessage: async (msg: LiveServerMessage) => {
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
               try {
                const ctx = audioContextRef.current;
                const audioData = base64ToUint8Array(base64Audio);
                const audioBuffer = await decodeAudioData(audioData, ctx, 24000, 1);
                
                const bufferSource = ctx.createBufferSource();
                bufferSource.buffer = audioBuffer;
                bufferSource.connect(ctx.destination);
                
                const startTime = Math.max(nextStartTimeRef.current, ctx.currentTime);
                bufferSource.start(startTime);
                nextStartTimeRef.current = startTime + audioBuffer.duration;
               } catch (err) {
                 console.error("Audio decode error:", err);
               }
            }
          },
          onclose: () => {
            console.log("Gemini Live Closed");
            setIsConnected(false);
            onDisconnect?.();
          },
          onerror: (err) => {
            console.error("Gemini Live Error:", err);
            onError?.(new Error("Gemini Live connection error"));
            setIsConnected(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: SYSTEM_INSTRUCTION,
        }
      });

      sessionPromiseRef.current = sessionPromise;

      cleanupRef.current = () => {
        source.disconnect();
        processor.disconnect();
        stream.getTracks().forEach(t => t.stop());
        outputCtx.close();
        inputCtx.close();
        // There isn't a direct "close" on the session object returned by connect in the current SDK typings 
        // derived from the documentation provided (which uses session.close() in text but typings might vary), 
        // but generally closing the websocket or releasing context is key.
        // Assuming session object has a close method based on standard WebSocket wrapping practices or docs.
        sessionPromise.then(s => {
            // Using a cast if strict typing misses it, or just rely on garbage collection if disconnect isn't explicit
            if (typeof (s as any).close === 'function') {
                (s as any).close();
            }
        });
      };

    } catch (error) {
      console.error("Connection failed", error);
      setIsConnecting(false);
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, [isConnected, isConnecting, onConnect, onDisconnect, onError]);

  const disconnect = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setIsConnected(false);
    sessionPromiseRef.current = null;
    setIsConnecting(false);
  }, []);

  const sendVideoFrame = useCallback(async (base64Image: string) => {
    if (!sessionPromiseRef.current) return;
    
    try {
      const session = await sessionPromiseRef.current;
      session.sendRealtimeInput({
        media: {
          mimeType: 'image/jpeg',
          data: base64Image
        }
      });
    } catch (err) {
      console.error("Error sending frame:", err);
    }
  }, []);

  useEffect(() => {
    return () => {
        disconnect();
    }
  }, [disconnect]);

  return {
    connect,
    disconnect,
    sendVideoFrame,
    isConnected,
    isConnecting
  };
};
