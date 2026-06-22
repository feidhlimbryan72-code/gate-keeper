import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { getDocument, updateDocument, addDocument } from '../lib/db';
import { CheckCircle, XCircle, Truck, ArrowRight } from 'lucide-react';

export default function Scanner() {
  const [mode, setMode] = useState('entry'); // 'entry' or 'exit'
  const [scanResult, setScanResult] = useState(null); // { type: 'success'|'error', msg: string, user?: object, vehicle?: object }
  const [linkedUser, setLinkedUser] = useState(null); // When a vehicle needs a driver
  const scannerRef = useRef(null);

  useEffect(() => {
    // Only initialize scanner if there is no scan result overlay taking up the screen
    if (scanResult) return;

    scannerRef.current = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: {width: 250, height: 250}, formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] },
      false
    );

    scannerRef.current.render(onScanSuccess, onScanFailure);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear html5QrcodeScanner. ", error);
        });
      }
    };
  }, [scanResult, mode, linkedUser]);

  const processWorkerScan = async (userId) => {
    const user = await getDocument('users', userId);
    if (!user) {
      setScanResult({ type: 'error', msg: 'USER NOT REGISTERED' });
      return;
    }

    if (mode === 'entry') {
      if (!user.safetyBriefingStatus) {
        setScanResult({ type: 'error', msg: 'SAFETY BRIEFING NOT COMPLETE. INBOUND ACCESS DENIED.' });
        return;
      }
      if (user.onSiteStatus) {
         // Already on site, let's treat it as success but maybe note it
         await addLog('entry', userId, 'user');
         setScanResult({ type: 'success', msg: `${user.fullName} is already on site. Double-scan logged.`, user });
         return;
      }
      await updateDocument('users', userId, { onSiteStatus: true });
      await addLog('entry', userId, 'user');
      setScanResult({ type: 'success', msg: `${user.fullName} CLEARED FOR ENTRY.`, user });
    } else {
      // exit
      await updateDocument('users', userId, { onSiteStatus: false });
      await addLog('exit', userId, 'user');
      setScanResult({ type: 'success', msg: `${user.fullName} CLEARED FOR EXIT.`, user });
    }
  };

  const processVehicleScan = async (vehicleId) => {
    const vehicle = await getDocument('vehicles', vehicleId);
    if (!vehicle) {
        // Since we didn't build vehicle reg form, auto-register for demo 
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
        // Exit
        await updateDocument('vehicles', vehicleId, { onSiteStatus: false });
        await addLog('exit', vehicleId, 'vehicle', linkedUser ? linkedUser.id : null);
        setScanResult({ type: 'success', msg: `VEHICLE EXITED.`, vehicle });
        setLinkedUser(null);
    }
  };

  const onScanSuccess = async (decodedText, decodedResult) => {
    // Determine if vehicle or worker
    // For demo, if it starts with 'v', it's a vehicle. Otherwise user.
    if (scannerRef.current) {
        await scannerRef.current.clear();
    }

    if (decodedText.startsWith('v')) {
      await processVehicleScan(decodedText);
    } else {
      await processWorkerScan(decodedText);
    }
  };

  const onScanFailure = (error) => {
    // standard scan tick error
  };

  const addLog = async (type, entityId, entityType, pairedId = null) => {
      await addDocument('logs', {
          type,
          entityId,
          entityType,
          guardId: 'g1', // mock guard
          pairedVehicleId: pairedId,
          timestamp: new Date().toISOString()
      });
  };

  const resetScanner = () => {
      setScanResult(null);
      if (scannerRef.current) {
          scannerRef.current.clear().catch(()=>{});
      }
  };

  return (
    <div className={`min-h-full flex flex-col ${scanResult?.type === 'success' ? 'bg-green-500' : scanResult?.type === 'error' ? 'bg-red-600' : 'bg-gray-100'}`}>
      
      {!scanResult && (
        <div className="p-4 bg-gray-900 border-b-2 border-yellow-400">
          <div className="flex bg-gray-800 rounded-lg p-1.5 shadow-inner">
            <button
              onClick={() => setMode('entry')}
              className={`flex-1 py-2.5 text-sm font-bold uppercase rounded-md transition-all ${
                mode === 'entry' ? 'bg-yellow-400 text-gray-900 shadow-md transform scale-105' : 'text-gray-400 hover:text-white'
              }`}
            >
              Entry Mode
            </button>
            <button
              onClick={() => setMode('exit')}
              className={`flex-1 py-2.5 text-sm font-bold uppercase rounded-md transition-all ${
                mode === 'exit' ? 'bg-yellow-400 text-gray-900 shadow-md transform scale-105' : 'text-gray-400 hover:text-white'
              }`}
            >
              Exit Mode
            </button>
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
        {!scanResult ? (
            <div className="flex-1 p-4 flex flex-col bg-black">
                <div id="qr-reader" className="w-full max-w-sm mx-auto overflow-hidden rounded-2xl bg-black border-4 border-gray-800 shadow-2xl flex-1 max-h-[400px]"></div>
                <div className="mt-6 text-center">
                    <p className="text-yellow-400 font-medium text-sm">Align QR Code within frame to automatically scan.</p>
                </div>
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
