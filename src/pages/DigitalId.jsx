import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { getDocument } from '../lib/db';
import { ShieldAlert, ShieldCheck, HardHat, RefreshCcw } from 'lucide-react';

export default function DigitalId() {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    setLoading(true);
    const data = await getDocument('users', userId);
    setUser(data);
    setLoading(false);
  };

  useEffect(() => {
    loadUser();
  }, [userId]);

  if (loading) {
    return <div className="p-6 text-center text-gray-500 font-bold mt-20 animate-pulse">Loading Digital ID...</div>;
  }

  if (!user) {
    return <div className="p-6 text-center text-red-500 font-bold mt-20">ID Not Found</div>;
  }

  return (
    <div className="p-6 flex flex-col items-center animate-in zoom-in-95 duration-500">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-3xl shadow-xl overflow-hidden text-center relative pt-8 pb-10 px-6">
        
        {/* Abstract design elements */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gray-900 -z-10 rounded-b-[40%]" />
        
        <div className="w-20 h-20 bg-white rounded-full mx-auto shadow-md flex items-center justify-center p-1 border-4 border-gray-100 mb-4">
          <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center">
            <HardHat className="w-10 h-10 text-gray-400" />
          </div>
        </div>

        <h2 className="text-2xl font-black text-gray-900 tracking-tight">{user.fullName}</h2>
        <p className="text-gray-500 font-bold uppercase text-[11px] tracking-widest mt-1 mb-6">{user.company}</p>

        {user.safetyBriefingStatus ? (
          <div className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-6 border border-green-200">
            <ShieldCheck className="w-4 h-4" /> Induction Complete
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-6 border border-red-200 animate-pulse">
            <ShieldAlert className="w-4 h-4" /> Pending Induction
          </div>
        )}

        <div className="bg-white p-4 rounded-3xl shadow-sm border-2 border-gray-100 inline-block">
          <QRCodeSVG 
            value={user.id} 
            size={220}
            level={"H"}
            fgColor={"#111827"}
            imageSettings={{
              src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' fill='white' viewBox='0 0 24 24'><path d='M12 2L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-3z'/></svg>",
              x: undefined,
              y: undefined,
              height: 48,
              width: 48,
              excavate: true,
            }}
          />
        </div>
        <p className="text-xs text-gray-400 font-mono mt-4">ID: {user.id.substring(0,8)}</p>

        <button onClick={loadUser} className="absolute top-4 right-4 text-white hover:text-yellow-400 transition-colors p-2 cursor-pointer">
           <RefreshCcw className="w-5 h-5" />
        </button>

      </div>

      <div className="mt-8 text-center max-w-sm">
        <p className="text-sm font-medium text-gray-500">Present this QR code to the gate guard for scanning upon entry and exit.</p>
      </div>
    </div>
  );
}
