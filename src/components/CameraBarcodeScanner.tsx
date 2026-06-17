/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Camera, AlertCircle, RefreshCw, Sparkles, Volume2, VolumeX, Grid
} from 'lucide-react';
import { Html5Qrcode, CameraDevice } from 'html5-qrcode';

interface CameraBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
  language?: 'ar' | 'en';
}

export const CameraBarcodeScanner: React.FC<CameraBarcodeScannerProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  language = 'ar'
}) => {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScannerRunning, setIsScannerRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scanningStatus, setScanningStatus] = useState<string>('');

  const qrCodeInstanceRef = useRef<Html5Qrcode | null>(null);
  const containerId = "barcode-scanner-viewport";

  // Audio synthesize beep function on scan success
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // high pure 880Hz pitch
      gainNode.gain.setValueAtTime(0.01, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.15); // fade out

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.warn("Audio Context beep error:", e);
    }
  };

  // Safe scanner initialization and lifecycle wrapper
  useEffect(() => {
    if (!isOpen) return;

    // Give the DOM brief time to paint the element viewport
    const initTimer = setTimeout(() => {
      initializeScanner();
    }, 400);

    return () => {
      clearTimeout(initTimer);
      stopScannerAndCleanup();
    };
  }, [isOpen]);

  const initializeScanner = async () => {
    setErrorMsg(null);
    setScanningStatus(language === 'ar' ? 'جاري التحقق من صلاحيات الكاميرا...' : 'Checking camera frame permissions...');

    try {
      // 1. Ask for permissions & discover cameras
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        throw new Error(language === 'ar' ? 'لم يتم العثور على أي كاميرا متصلة بالجهاز' : 'No camera devices discovered.');
      }

      setCameras(devices);
      
      // Auto-choose environment back camera if possible, or fallback to first
      const backCamera = devices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      );
      
      const defaultCameraId = backCamera ? backCamera.id : devices[0].id;
      setSelectedCameraId(defaultCameraId);

      // Start stream
      startScannerWithDevice(defaultCameraId);
    } catch (err: any) {
      console.error("Camera discovery error:", err);
      setErrorMsg(err.message || (language === 'ar' ? 'فشل تشغيل ميزة الكاميرا. تأكد من إعطاء الصلاحيات للموقع في المتصفح.' : 'Failed to launch camera feed. Please check permission settings.'));
      setScanningStatus('');
    }
  };

  const startScannerWithDevice = async (deviceId: string) => {
    setErrorMsg(null);
    setScanningStatus(language === 'ar' ? 'جاري تشغيل كاميرا المسح...' : 'Initializing scanner lens...');
    
    // Stop any existing session
    if (qrCodeInstanceRef.current) {
      try {
        await qrCodeInstanceRef.current.stop();
      } catch (e) {
        // quiet ignore stop errors
      }
    }

    try {
      const html5QrCode = new Html5Qrcode(containerId);
      qrCodeInstanceRef.current = html5QrCode;

      await html5QrCode.start(
        deviceId,
        {
          fps: 15,
          qrbox: (width, height) => {
            // Wide horizontal box optimized for standard barcodes
            const boxWidth = Math.min(width * 0.85, 320);
            const boxHeight = Math.min(height * 0.45, 140);
            return { x: (width - boxWidth) / 2, y: (height - boxHeight) / 2, width: boxWidth, height: boxHeight };
          },
          aspectRatio: 1.777778 // 16:9
        },
        (decodedText) => {
          // Success Callback
          playBeep();
          onScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Very verbose quiet error for failing frame reads, normal in real-time
        }
      );

      setIsScannerRunning(true);
      setScanningStatus(language === 'ar' ? 'ماسح الباركود نشط ومستعد للكشف...' : 'Camera barcode scanner active...');
    } catch (err: any) {
      console.error("Failed to start barcode scanner:", err);
      setErrorMsg(language === 'ar' ? 'فشل بدء دفق الفيديو من الكاميرا المختارة.' : 'Failed to stream video from selected camera.');
      setIsScannerRunning(false);
      setScanningStatus('');
    }
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextId = e.target.value;
    setSelectedCameraId(nextId);
    if (nextId) {
      startScannerWithDevice(nextId);
    }
  };

  const stopScannerAndCleanup = async () => {
    setIsScannerRunning(false);
    if (qrCodeInstanceRef.current) {
      try {
        if (qrCodeInstanceRef.current.isScanning) {
          await qrCodeInstanceRef.current.stop();
        }
      } catch (e) {
        console.warn("Error stopping scanner instances:", e);
      } finally {
        qrCodeInstanceRef.current = null;
      }
    }
  };

  const handleManualClose = async () => {
    await stopScannerAndCleanup();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div id="camera_barcode_scanner_root" className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 overflow-y-auto">
      <motion.div
        id="camera_barcode_scanner_container"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-950 text-white rounded-2xl shadow-2xl border border-slate-800 w-full max-w-lg overflow-hidden flex flex-col relative"
      >
        {/* Glowing Decorative Border */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#004a99] via-emerald-500 to-indigo-600"></div>

        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
              <Camera size={18} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                {language === 'ar' ? 'قارئ باركود الكاميرا المباشر 📸' : 'Live Camera Barcode Scanner 📸'}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium font-mono">
                {language === 'ar' ? 'ضع باركود المنتج داخل المستطيل الأخضر' : 'Align retail packaging barcode within green zone'}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleManualClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Viewport Core */}
        <div className="p-5 flex-1 flex flex-col gap-4">
          
          {/* Sound volume setting & status indicators */}
          <div className="flex items-center justify-between text-xs font-semibold px-1">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isScannerRunning ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
              <span className="text-[11px] text-slate-300">
                {scanningStatus || (language === 'ar' ? 'ماسح غير نشط' : 'Scanner Idle')}
              </span>
            </div>
            
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={language === 'ar' ? 'كتم/تشغيل صوت التنبيه' : 'Toggle scan sound'}
              className="p-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-slate-300 hover:text-yellow-400 transition-colors cursor-pointer flex items-center gap-1 text-[10px]"
            >
              {soundEnabled ? <Volume2 size={13} className="text-green-400" /> : <VolumeX size={13} />}
              <span>{language === 'ar' ? (soundEnabled ? 'صوت نشط' : 'كتم') : (soundEnabled ? 'BEEP ON' : 'MUTED')}</span>
            </button>
          </div>

          {/* Scanner Window Stream Frame */}
          <div className="relative aspect-[4/3] bg-black border border-slate-800 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
            
            {/* Real Web Camera Stream Render container */}
            <div 
              id={containerId} 
              className="w-full h-full object-cover [&_video]:object-cover [&_video]:w-full [&_video]:h-full scale-x-100" 
            />

            {/* Overlays / Crosshairs / Guides */}
            {isScannerRunning && (
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 bg-transparent">
                {/* Visual Scanning Line - Lasers */}
                <div className="absolute left-[10%] right-[10%] top-[48%] h-[2px] bg-emerald-500 opacity-80 shadow-[0_0_8px_#10b981] animate-bounce"></div>
                
                {/* Framing corners decoration */}
                <div className="absolute top-6 left-6 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-md"></div>
                <div className="absolute top-6 right-6 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-md"></div>
                <div className="absolute bottom-6 left-6 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-md"></div>
                <div className="absolute bottom-6 right-6 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-md"></div>

                {/* Subtext tips */}
                <div className="absolute inset-x-0 bottom-4 text-center">
                  <span className="bg-slate-900/80 backdrop-blur-xs text-emerald-400 text-[10px] font-black tracking-widest px-3 py-1 rounded-full border border-slate-800 inline-block">
                    {language === 'ar' ? 'جاري البحث المستمر...' : 'SEARCHING LIVE SENSORS...'}
                  </span>
                </div>
              </div>
            )}

            {/* Initial permissions state loading */}
            {!isScannerRunning && !errorMsg && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 p-6 text-center space-y-3">
                <RefreshCw className="text-blue-500 animate-spin" size={32} />
                <p className="text-xs text-slate-400 font-bold">{scanningStatus}</p>
              </div>
            )}

            {/* Error Overlay */}
            {errorMsg && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 p-6 text-center space-y-4">
                <AlertCircle className="text-red-500 animate-pulse" size={36} />
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-rose-500">{language === 'ar' ? 'فشل تشغيل الكاميرا' : 'Lens Inaccessible'}</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed font-semibold">
                    {errorMsg}
                  </p>
                </div>
                <button 
                  onClick={initializeScanner}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg cursor-pointer transition-all hover:scale-[1.01]"
                >
                  {language === 'ar' ? 'إعادة المحاولة ومطالبة الإذن' : 'Request Permissions Again'}
                </button>
              </div>
            )}
          </div>

          {/* Camera Devices Dropdown selection (if device has multiple lenses like back wide / ultra wide / front) */}
          {cameras.length > 1 && (
            <div className="bg-slate-900 border border-slate-850 p-3 rounded-xl flex items-center gap-3">
              <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap shrink-0">{language === 'ar' ? 'تبديل الكاميرا:' : 'Select Lens:'}</span>
              <select
                value={selectedCameraId}
                onChange={handleCameraChange}
                className="w-full text-xs font-semibold bg-slate-950 text-slate-200 border border-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {cameras.map((cam) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label || `Camera ${cam.id.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Guidelines Tips */}
          <div className="p-3 bg-slate-900/50 border border-slate-900 rounded-xl text-[10px] leading-relaxed text-slate-400 font-medium">
            💡 {language === 'ar' 
              ? 'توجيه: للمسح الأمثل، حافظ على مسافة مناسبة (حوالي ١٠ سم) وتأكد من أن الإضاءة كافية ومستقرة حول المنتج.' 
              : 'Tip: For optimized detection, hover approximately 10cm away and keep barcode perpendicular under a steady bright environment.'}
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-900 bg-slate-950 flex items-center justify-between">
          <p className="text-[10px] text-slate-500 font-bold font-mono">
            DAY-TO-NIGHT SMART POS CAMSCAN v2.0
          </p>
          <button
            onClick={handleManualClose}
            className="px-4 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            {language === 'ar' ? 'إلغاء وإغلاق' : 'Close Lens'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
