import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { getDocument, updateDocument, addDocument, getCollection, getAssignmentForUserAndEvent } from '../lib/db';
import { CheckCircle, XCircle, Truck, ArrowRight, ShieldAlert, Camera, Calendar } from 'lucide-react';

export default function Scanner() {
  const [mode, setMode] = useState('entry'); // 'entry' or 'exit'
  const [scanResult, setScanResult] = useState(null); // { type: 'success'|'error', msg: string, user?: object, vehicle?: object }
  const [linkedUser, setLinkedUser] = useState(null); // When a vehicle needs a driver
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  
  const scannerRef = useRef(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await getCollection('events');
        setEvents(data);
        if (data.length > 0) {
          setSelectedEventId(data[0].id);
        }
      } catch (err) {
        console.error("Error loading events for scanner:", err);
      }
    };
    fetchEvents();
  }, []);

  const processWorkerScan = async (userId) => {
    if (!selectedEventId) {
      setScanResult({ type: 'error', msg: 'NO EVENT SELECTED' });
      return;
    }

    const user = await getDocument('users', userId);
    if (!user) {
      setScanResult({ type: 'error', msg: 'USER NOT REGISTERED' });
      return;
    }

    const eventName = events.find(e => e.id === selectedEventId)?.name || 'Event';

    // Verify assignment and safety quiz completion for this specific event
    const assignment = await getAssignmentForUserAndEvent(userId, selectedEventId);
    if (!assignment) {
      setScanResult({ 
        type: 'error', 
        msg: `ACCESS DENIED: NOT ASSIGNED TO ${eventName.toUpperCase()}.` 
      });
      return;
    }

    if (!assignment.inductionStatus) {
      setScanResult({ 
        type: 'error', 
        msg: `ACCESS DENIED: PENDING BRIEFING FOR ${eventName.toUpperCase()}.` 
      });
      return;
    }

    if (mode === 'entry') {
      if (user.onSiteStatus) {
         await addLog('entry', userId, 'user');
         setScanResult({ type: 'success', msg: `${user.fullName} is already on site. Double-scan logged.`, user });
         return;
      }
      await updateDocument('users', userId, { onSiteStatus: true });
      await addLog('entry', userId, 'user');
      setScanResult({ type: 'success', msg: `${user.fullName} CLEARED FOR ENTRY (${eventName}).`, user });
    } else {
      await updateDocument('users', userId, { onSiteStatus: false });
      await addLog('exit', userId, 'user');
      setScanResult({ type: 'success', msg: `${user.fullName} CLEARED FOR EXIT (${eventName}).`, user });
    }
  };

  const processVehicleScan = async (vehicleId) => {
    const vehicle = await getDocument('vehicles', vehicleId);
    if (!vehicle) {
        await addDocument('vehicles', {
            id: vehicleId,
            licensePlate: 'SCANNED',
            company: 'Unknown',
            onSiteStatus: false
        });
        setScanResult({ type: 'error', msg: `VEHICLE NOT FOUND. Please pre-register. (ID: ${vehicleId})` });
        return;
    }

    if (mode === 'entry') {
        if (!linkedUser) {
            setScanResult({ type: 'error', msg: 'GHOST VEHICLE DETECTED. Secondary scan required to ASSIGN DRIVER.' });
            return;
        }
        await updateDocument('vehicles', vehicleId, { onSiteStatus: true });
        await addLog('entry', vehicleId, 'vehicle', linkedUser.id);
        setScanResult({ type: 'success', msg: `VEHICLE CLEARED. Linked to ${linkedUser.fullName}.`, vehicle, user: linkedUser });
        setLinkedUser(null);
    } else {
        await updateDocument('vehicles', vehicleId, { onSiteStatus: false });
        await addLog('exit', vehicleId, 'vehicle', linkedUser ? linkedUser.id : null);
        setScanResult({ type: 'success', msg: `VEHICLE EXITED.`, vehicle });
        setLinkedUser(null);
    }
  };

  const onScanSuccess = async (decodedText) => {
    if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop().catch(e => console.error(e));
        setIsScanning(false);
    }

    if (decodedText.startsWith('v')) {
      await processVehicleScan(decodedText);
    } else {
      await processWorkerScan(decodedText);
    }
  };

  useEffect(() => {
    if (scanResult) return;
    if (events.length === 0) return; // Wait for events to load

    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    const startScanner = async () => {
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          onScanSuccess,
          () => {}
        );
        setIsScanning(true);
        setError(null);
      } catch (err) {
        console.error("Camera access error:", err);
        setError("Camera permission required. Please allow camera access in your settings.");
        setIsScanning(false);
      }
    };

    const timer = setTimeout(startScanner, 300);

    return () => {
      clearTimeout(timer);
      if (scanner && scanner.isScanning) {
        scanner.stop().catch(e => console.error("Error stopping scanner:", e));
      }
    };
  }, [scanResult, mode, linkedUser, events]);

  const addLog = async (type, entityId, entityType, pairedId = null) => {
      await addDocument('logs', {
          type,
          entityId,
          entityType,
          pairedVehicleId: pairedId,
          timestamp: new Date().toISOString()
      });
  };

  const resetScanner = () => {
      setScanResult(null);
  };

  return (
    <div className={`min-h-full flex flex-col ${scanResult?.type === 'success' ? 'bg-green-500' : scanResult?.type === 'error' ? 'bg-red-600' : 'bg-gray-100'}`}>
      
      {!scanResult && (
        <div className="bg-gray-900 border-b-2 border-yellow-400">
          {/* Mode Selector */}
          <div className="p-4 pb-2">
            <div className="flex bg-gray-800 rounded-lg p-1.5 shadow-inner">
              <button
                onClick={() => setMode('entry')}
                className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${
                  mode === 'entry' ? 'bg-yellow-400 text-gray-900 shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                Entry Mode
              </button>
              <button
                onClick={() => setMode('exit')}
                className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${
                  mode === 'exit' ? 'bg-yellow-400 text-gray-900 shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                Exit Mode
              </button>
            </div>
          </div>

          {/* Event Selector for Gatekeeper */}
          <div className="px-4 pb-4 flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-yellow-400" /> Active Event Gatekeep
            </label>
            {events.length > 0 ? (
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-yellow-400 font-semibold"
              >
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.name} ({ev.location})</option>
                ))}
              </select>
            ) : (
              <div className="text-red-400 text-xs font-semibold py-1">
                No events configured. Configure events in Admin first.
              </div>
            )}
          </div>
        </div>
      )}

      {linkedUser && !scanResult && (
          <div className="bg-yellow-400 p-3 flex justify-between items-center text-gray-900 font-bold border-b-4 border-yellow-500">
              <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5"/>
                  <span className="text-sm">Link Vehicle to {linkedUser.fullName}</span>
              </div>
              <button className="bg-gray-900 text-yellow-400 px-3 py-1 text-xs rounded-full cursor-pointer hover:bg-gray-800" onClick={()=>setLinkedUser(null)}>
                 Cancel
              </button>
          </div>
      )}

      <div className="flex-1 flex flex-col">
        {events.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-gray-100">
             <ShieldAlert className="w-16 h-16 text-gray-400 mb-4 animate-bounce" />
             <h3 className="text-lg font-black text-gray-900">Setup Required</h3>
             <p className="text-xs text-gray-500 max-w-[240px] mt-1">Please create an event in the Desktop Admin dashboard before scanning workers.</p>
          </div>
        ) : !scanResult ? (
            <div className="flex-1 p-4 flex flex-col bg-black justify-center">
                <div className="relative w-full max-w-sm mx-auto aspect-square flex flex-col">
                  <div id="qr-reader" className="w-full h-full overflow-hidden rounded-2xl bg-slate-950 border-4 border-gray-800 shadow-2xl"></div>
                  
                  {!isScanning && (
                    <div 
                      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 text-center p-6 border-2 border-dashed border-slate-700 rounded-2xl"
                      style={{ backgroundColor: '#0f172a' }}
                    >
                      <ShieldAlert className="w-12 h-12 text-yellow-400 mb-3 animate-pulse" />
                      <h3 className="font-bold text-white text-base" style={{ color: '#ffffff' }}>Camera Feed Offline</h3>
                      <p className="text-slate-400 text-xs mt-1 max-w-[240px] leading-relaxed mb-4" style={{ color: '#94a3b8' }}>
                        {error || "We need permission to access your device's camera to scan barcodes."}
                      </p>
                      <button 
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-yellow-400 text-gray-900 font-bold rounded-lg text-xs uppercase tracking-wider hover:bg-yellow-500 transition-colors cursor-pointer"
                        style={{ backgroundColor: '#facc15', color: '#0f172a' }}
                      >
                        Enable Camera
                      </button>
                    </div>
                  )}
                </div>

                {isScanning && (
                  <div className="mt-6 text-center flex items-center justify-center gap-2 text-yellow-400 animate-pulse font-medium text-sm">
                    <Camera className="w-4 h-4" />
                    <span>Live Scanner Active. Align QR code within frame.</span>
                  </div>
                )}
            </div>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-200">
                {scanResult.type === 'success' ? (
                    <CheckCircle className="w-24 h-24 text-white mb-6 animate-pulse" />
                ) : (
                    <XCircle className="w-24 h-24 text-white mb-6 animate-bounce" />
                )}
                
                <h2 className="text-3xl font-black text-white uppercase tracking-wider leading-tight mb-4 shadow-black/20 drop-shadow-md">
                   {scanResult.msg}
                </h2>

                {scanResult.type === 'success' && scanResult.user && !scanResult.vehicle && mode === 'entry' && (
                    <button 
                        onClick={() => {
                            setLinkedUser(scanResult.user);
                            resetScanner();
                        }}
                        className="mt-6 cursor-pointer bg-white text-green-700 font-black py-4 px-8 rounded-xl shadow-[0_4px_14px_0_rgba(0,0,0,0.2)] flex items-center gap-2 transition-all active:scale-95 text-lg"
                    >
                        <Truck className="w-6 h-6" />
                        Link Vehicle Next
                    </button>
                )}

                <button 
                    onClick={resetScanner}
                    className={`mt-10 cursor-pointer w-full py-5 px-6 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-transform active:scale-95 text-lg ${scanResult.type === 'success' ? 'bg-green-700 text-white hover:bg-green-800' : 'bg-red-800 text-white hover:bg-red-900 border-2 border-red-400/30'}`}
                >
                    Scan Next <ArrowRight className="w-6 h-6" />
                </button>
            </div>
        )}
      </div>

    </div>
  );
}
