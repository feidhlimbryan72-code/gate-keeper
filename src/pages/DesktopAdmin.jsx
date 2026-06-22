import React, { useEffect, useState } from 'react';
import { getCollection, updateDocument, addDocument, deleteDocument } from '../lib/db';
import { Users, ShieldAlert, ShieldCheck, ClipboardList, Trash2, PlusCircle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function DesktopAdmin() {
  const [manifests, setManifests] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newManifestName, setNewManifestName] = useState('');
  const [newManifestCompany, setNewManifestCompany] = useState('');

  const loadData = async () => {
    setManifests(await getCollection('manifest'));
    setUsers(await getCollection('users'));
  };

  useEffect(() => {
    // Initial fetch and polling
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAddManifest = async (e) => {
    e.preventDefault();
    if (!newManifestName.trim() || !newManifestCompany.trim()) return;
    await addDocument('manifest', {
        fullName: newManifestName.trim(),
        company: newManifestCompany.trim()
    });
    setNewManifestName('');
    setNewManifestCompany('');
    loadData();
  };

  const handleWithdraw = async (id) => {
      if(window.confirm("Are you sure you want to withdraw this person from the approved manifest? They will no longer be able to register.")) {
         await deleteDocument('manifest', id);
         loadData();
      }
  };

  const toggleSafety = async (userId, status) => {
    await updateDocument('users', userId, { safetyBriefingStatus: !status });
    loadData();
  };

  const totalOnSite = users.filter(u => u.onSiteStatus).length;
  
  const filteredManifests = manifests.filter(m => 
     m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
     m.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row w-full max-w-full font-sans">
      
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-gray-900 text-white flex flex-col shadow-2xl relative z-10">
        <div className="p-6 border-b border-gray-800">
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <ShieldCheck className="w-8 h-8 text-yellow-400" />
                GATE<span className="text-yellow-400">HQ</span>
            </h1>
            <p className="text-gray-400 text-xs font-medium mt-1 uppercase tracking-widest">Desktop Admin Hub</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
            <a href="#" className="flex items-center gap-3 bg-gray-800/50 text-white px-4 py-3 rounded-xl font-bold border-l-4 border-yellow-400 transition-colors">
                <ClipboardList className="w-5 h-5 text-yellow-400" /> Crew Manifests
            </a>
            <div className="flex items-center gap-3 text-gray-400 px-4 py-3 rounded-xl font-bold cursor-not-allowed opacity-50">
                <Users className="w-5 h-5" /> Analytics
            </div>
        </nav>

        <div className="p-4 border-t border-gray-800 space-y-2">
            <button 
                onClick={() => supabase.auth.signOut()} 
                className="w-full py-2 bg-red-950/40 hover:bg-red-900/40 text-red-400 text-sm font-medium rounded-lg transition-colors cursor-pointer border border-red-900/20"
            >
                Log Out
            </button>
            <Link to="/dashboard" className="block text-center w-full py-2 bg-gray-800 hover:bg-gray-700 text-sm font-medium rounded-lg transition-colors">
                Return to Mobile Guard
            </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
         <header className="bg-white shadow-sm px-8 py-5 flex items-center justify-between z-0">
             <div>
                 <h2 className="text-2xl font-black text-gray-900">Crew Manifest & Access Control</h2>
                 <p className="text-sm text-gray-500 font-medium">Add or withdraw names from the active site manifest.</p>
             </div>
             
             <div className="flex items-center gap-6">
                 <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Live On-Site</p>
                    <p className="text-3xl font-black text-gray-900">{totalOnSite}</p>
                 </div>
                 <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-yellow-600" />
                 </div>
             </div>
         </header>

         <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-8">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 max-w-7xl mx-auto">
                
                {/* Manifest Management (Takes up 2 columns on extra large) */}
                <div className="xl:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-900 text-white">
                            <h3 className="text-xl font-black flex items-center gap-2">
                                <ClipboardList className="w-6 h-6 text-yellow-400" /> Authorized Roster
                            </h3>
                            <input 
                                value={searchTerm}
                                onChange={e=>setSearchTerm(e.target.value)}
                                placeholder="Search manifest..." 
                                className="bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-2 text-sm focus:ring-yellow-400 outline-none w-full sm:w-64"
                            />
                        </div>
                        
                        <div className="p-6 bg-gray-50 border-b border-gray-100">
                            <form onSubmit={handleAddManifest} className="flex flex-col sm:flex-row gap-3">
                                <input value={newManifestName} onChange={e=>setNewManifestName(e.target.value)} placeholder="Full Name (e.g. John Doe)" className="flex-1 bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-yellow-400 font-semibold shadow-sm" required />
                                <input value={newManifestCompany} onChange={e=>setNewManifestCompany(e.target.value)} placeholder="Contractor Company" className="flex-1 bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-yellow-400 font-semibold shadow-sm" required />
                                <button type="submit" className="bg-yellow-400 text-gray-900 font-black px-6 py-3 rounded-xl hover:bg-yellow-500 transition-colors shadow-sm flex items-center justify-center gap-2">
                                   <PlusCircle className="w-5 h-5" /> Add Worker
                                </button>
                            </form>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 text-gray-500 text-xs uppercase tracking-wider font-bold">
                                        <th className="p-4 pl-6">Worker Name</th>
                                        <th className="p-4">Company</th>
                                        <th className="p-4 text-center">Registration Status</th>
                                        <th className="p-4 pr-6 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredManifests.map(m => {
                                        // Check if this manifest user has registered
                                        const registeredUser = users.find(u => u.fullName.toLowerCase() === m.fullName.toLowerCase() && u.company.toLowerCase() === m.company.toLowerCase());
                                        return (
                                            <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="p-4 pl-6 font-bold text-gray-900">{m.fullName}</td>
                                                <td className="p-4 text-sm font-medium text-gray-600">
                                                    <span className="bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200">{m.company}</span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    {registeredUser ? (
                                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full"><CheckCircle className="w-3.5 h-3.5"/> Registered</span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">Pending</span>
                                                    )}
                                                </td>
                                                <td className="p-4 pr-6 text-right">
                                                    <button onClick={() => handleWithdraw(m.id)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors inline-flex items-center gap-1.5 font-bold text-xs">
                                                        <Trash2 className="w-4 h-4" /> Withdraw
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {filteredManifests.length === 0 && (
                                        <tr><td colSpan="4" className="p-8 text-center text-gray-400 font-medium">No results found in manifest.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Column - Registered Users / Induction Overview */}
                <div className="space-y-6">
                     <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden flex flex-col h-full">
                        <div className="p-5 border-b border-gray-100 bg-blue-900 text-white">
                            <h3 className="text-lg font-black flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5 text-blue-400" /> Active Registrations
                            </h3>
                            <p className="text-xs text-blue-200 font-medium mt-1">Manage safety inductions for registered workers.</p>
                        </div>
                        <div className="divide-y divide-gray-100 overflow-y-auto max-h-[600px] flex-1">
                            {users.map(u => (
                                <div key={u.id} className="p-4 flex flex-col gap-3 hover:bg-gray-50 transition-colors">
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{u.fullName}</p>
                                        <p className="text-xs text-gray-500">{u.company}</p>
                                    </div>
                                    <button 
                                        onClick={() => toggleSafety(u.id, u.safetyBriefingStatus)}
                                        className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-1.5 ${u.safetyBriefingStatus ? 'bg-green-100 text-green-800 hover:bg-green-200 ring-1 ring-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200 ring-1 ring-red-200'}`}
                                    >
                                        {u.safetyBriefingStatus ? <><ShieldCheck className="w-4 h-4" /> Induction Complete</> : <><ShieldAlert className="w-4 h-4" /> Pending Induction</>}
                                    </button>
                                </div>
                            ))}
                            {users.length === 0 && <div className="p-6 text-center text-sm text-gray-400 font-medium">No workers have registered yet.</div>}
                        </div>
                     </div>
                </div>

            </div>
         </main>
      </div>

    </div>
  );
}
