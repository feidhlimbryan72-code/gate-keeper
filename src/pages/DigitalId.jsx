import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { getDocument, getUserAssignments } from '../lib/db';
import { ShieldAlert, ShieldCheck, HardHat, RefreshCcw, Calendar, MapPin, Play } from 'lucide-react';

export default function DigitalId() {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const userData = await getDocument('users', userId);
      setUser(userData);
      
      if (userData) {
        const userAssignments = await getUserAssignments(userId);
        setAssignments(userAssignments);
      }
    } catch (err) {
      console.error("Error loading ID data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  if (loading) {
    return <div className="p-6 text-center text-gray-500 font-bold mt-20 animate-pulse">Loading Digital ID...</div>;
  }

  if (!user) {
    return <div className="p-6 text-center text-red-500 font-bold mt-20">ID Not Found</div>;
  }

  // A worker is cleared overall if they have at least one event cleared, but validation is checked per event at the gate
  const hasActiveAccess = assignments.some(a => a.inductionStatus && a.accessStatus);

  return (
    <div className="p-6 flex flex-col items-center animate-in zoom-in-95 duration-500 pb-28">
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

        {hasActiveAccess ? (
          <div className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-6 border border-green-200">
            <ShieldCheck className="w-4 h-4" /> Active Site Clearance
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-6 border border-red-200 animate-pulse">
            <ShieldAlert className="w-4 h-4" /> Induction Pending
          </div>
        )}

        <div className="bg-white p-4 rounded-3xl shadow-sm border-2 border-gray-100 inline-block mb-6">
          <QRCodeSVG 
            value={user.id} 
            size={200}
            level={"H"}
            fgColor={"#111827"}
            imageSettings={{
              src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' fill='white' viewBox='0 0 24 24'><path d='M12 2L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-3z'/></svg>",
              x: undefined,
              y: undefined,
              height: 40,
              width: 40,
              excavate: true,
            }}
          />
        </div>
        <p className="text-[10px] text-gray-400 font-mono">ID: {user.id.substring(0,8)}</p>

        <button onClick={loadData} className="absolute top-4 right-4 text-white hover:text-yellow-400 transition-colors p-2 cursor-pointer">
           <RefreshCcw className="w-5 h-5" />
        </button>

        {/* Assigned Events Section */}
        <div className="mt-8 border-t border-gray-100 pt-6 text-left">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-4">Assigned Events</h3>
          
          <div className="space-y-3">
            {assignments.map(a => {
              if (!a.event) return null;
              return (
                <div key={a.id} className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200/60 flex flex-col gap-2.5">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-gray-900 leading-tight">{a.event.name}</h4>
                      <p className="text-[10px] text-gray-500 font-medium mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0" /> {a.event.location}
                      </p>
                      <p className="text-[10px] text-gray-500 font-medium flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 shrink-0" /> {a.event.date}
                      </p>
                    </div>
                    {a.inductionStatus ? (
                      <span className="text-[9px] font-black uppercase tracking-wider bg-green-100 text-green-800 border border-green-200 px-2 py-0.5 rounded-md whitespace-nowrap">
                        Cleared
                      </span>
                    ) : (
                      <span className="text-[9px] font-black uppercase tracking-wider bg-red-100 text-red-800 border border-red-200 px-2 py-0.5 rounded-md whitespace-nowrap animate-pulse">
                        Briefing Required
                      </span>
                    )}
                  </div>
                  
                  {!a.inductionStatus && (
                    <Link
                      to={`/induction/${a.event.id}/${user.id}`}
                      className="w-full flex items-center justify-center gap-1.5 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-black py-2 px-3 rounded-xl text-xs uppercase transition-colors shadow-sm active:scale-[0.98] select-none"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Start Safety Briefing
                    </Link>
                  )}
                </div>
              );
            })}
            
            {assignments.length === 0 && (
              <div className="p-4 text-center border-2 border-dashed border-gray-200 rounded-2xl text-xs text-gray-400 font-medium">
                No active event assignments found. Please contact administration to register for an event.
              </div>
            )}
          </div>
        </div>

      </div>

      <div className="mt-6 text-center max-w-sm">
        <p className="text-xs font-semibold text-gray-400">Present this QR code to the gate guard. They will check your safety induction status for the selected event.</p>
      </div>
    </div>
  );
}
