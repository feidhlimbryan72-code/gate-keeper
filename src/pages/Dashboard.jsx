import React, { useEffect, useState } from 'react';
import { getCollection, updateDocument, addDocument } from '../lib/db';
import { Users, Search, Download, ShieldAlert, ShieldCheck, Activity, ClipboardList, PlusCircle } from 'lucide-react';

export default function Dashboard() {
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [manifests, setManifests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newManifestName, setNewManifestName] = useState('');
  const [newManifestCompany, setNewManifestCompany] = useState('');

  const loadData = async () => {
    const loadedUsers = await getCollection('users');
    const loadedLogs = await getCollection('logs');
    const loadedManifests = await getCollection('manifest');
    setUsers(loadedUsers);
    setManifests(loadedManifests);
    
    // sorting logs by latest
    setLogs(loadedLogs.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)));
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Polling for demo
    return () => clearInterval(interval);
  }, []);

  const totalOnSite = users.filter(u => u.onSiteStatus).length;

  const toggleSafety = async (userId, status) => {
    await updateDocument('users', userId, { safetyBriefingStatus: !status });
    loadData();
  };

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

  const filteredLogs = logs.filter(log => {
      // Find associated entity name/id
      const u = users.find(u => u.id === log.entityId);
      const name = u ? u.fullName.toLowerCase() : log.entityId.toLowerCase();
      return name.includes(searchTerm.toLowerCase());
  });

  const exportCSV = () => {
      const csvRows = [];
      const headers = ['Timestamp', 'Type', 'EntityId', 'EntityType', 'PairedVehicleId'];
      csvRows.push(headers.join(','));

      for (const row of logs) {
          const values = [
              row.timestamp,
              row.type,
              row.entityId,
              row.entityType,
              row.pairedVehicleId || 'N/A'
          ];
          csvRows.push(values.join(','));
      }

      const csvData = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const csvUrl = URL.createObjectURL(csvData);
      const link = document.createElement('a');
      link.href = csvUrl;
      link.download = `gate_logs_${new Date().getTime()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="p-4 bg-gray-50 min-h-full animate-in fade-in duration-500">
      
      <div className="bg-gray-900 rounded-3xl p-6 shadow-xl mb-6 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-yellow-400 rounded-full blur-3xl opacity-20 pointer-events-none" />
        <div className="flex items-center justify-between">
            <div>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-1">Total Workers On-Site</p>
                <div className="text-5xl font-black text-white flex items-baseline gap-2">
                    {totalOnSite}
                    <span className="text-sm text-yellow-400 font-medium tracking-normal align-middle ml-2 animate-pulse flex items-center"><Activity className="w-4 h-4 mr-1"/> LIVE</span>
                </div>
            </div>
            <div className="w-14 h-14 bg-gray-800 rounded-2xl flex items-center justify-center border border-gray-700 shadow-inner">
                <Users className="w-7 h-7 text-yellow-400" />
            </div>
        </div>
      </div>

      <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="w-5 h-5 text-gray-900" />
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Approved Manifest Lists</h2>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-4 p-4">
              <form onSubmit={handleAddManifest} className="flex gap-2">
                  <input value={newManifestName} onChange={e=>setNewManifestName(e.target.value)} placeholder="Full Name" className="flex-1 bg-gray-50 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-yellow-400 font-medium text-gray-900" />
                  <input value={newManifestCompany} onChange={e=>setNewManifestCompany(e.target.value)} placeholder="Company" className="flex-1 bg-gray-50 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-yellow-400 font-medium text-gray-900" />
                  <button type="submit" className="bg-gray-900 text-yellow-400 p-2 rounded-xl hover:bg-gray-800 transition-colors shadow-sm cursor-pointer whitespace-nowrap flex items-center font-bold px-4 text-xs uppercase">
                      <PlusCircle className="w-5 h-5 mr-1" /> Add
                  </button>
              </form>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 divide-y divide-gray-100 overflow-hidden max-h-48 overflow-y-auto">
              {manifests.map(m => (
                  <div key={m.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                      <p className="font-bold text-sm text-gray-900">{m.fullName}</p>
                      <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200">{m.company}</p>
                  </div>
              ))}
              {manifests.length === 0 && <div className="p-4 text-center text-sm text-gray-500">No manifest records.</div>}
          </div>
      </div>

      <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-5 h-5 text-gray-900" />
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Induction Management</h2>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              {users.map(u => (
                  <div key={u.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div>
                          <p className="font-bold text-gray-900">{u.fullName}</p>
                          <p className="text-xs text-gray-500 font-medium">{u.company}</p>
                      </div>
                      <button 
                        onClick={() => toggleSafety(u.id, u.safetyBriefingStatus)}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 ${u.safetyBriefingStatus ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-200'}`}
                      >
                          {u.safetyBriefingStatus ? <><ShieldCheck className="w-4 h-4" /> Briefed</> : <><ShieldAlert className="w-4 h-4" /> Pending</>}
                      </button>
                  </div>
              ))}
              {users.length === 0 && <div className="p-4 text-center text-sm text-gray-500">No users found.</div>}
          </div>
      </div>

      <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                <Search className="w-5 h-5" /> Activity Logs
            </h2>
            <button onClick={exportCSV} className="text-xs flex items-center gap-1 font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors shadow-sm cursor-pointer">
                <Download className="w-4 h-4" /> CSV Export
            </button>
          </div>
          
          <div className="relative mb-4 shadow-sm group">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400 group-focus-within:text-yellow-500 transition-colors" />
              <input 
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
                 placeholder="Search logs by ID or Name..." 
                 className="w-full bg-white border-2 border-gray-200 py-2.5 pl-10 pr-4 rounded-xl text-sm outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 transition-all font-medium"
               />
          </div>

          <div className="space-y-3">
              {filteredLogs.slice(0, 50).map(log => {
                  const u = users.find(user => user.id === log.entityId);
                  const name = u ? u.fullName : log.entityId;
                  const isEntry = log.type === 'entry';
                  return (
                      <div key={log.id + Math.random()} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-start gap-4">
                          <div className={`mt-0.5 w-2 h-2 rounded-full ${isEntry ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`} />
                          <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-gray-900 truncate">
                                <span className={isEntry ? 'text-green-600' : 'text-red-600 uppercase tracking-wider'}>{log.type}</span>: {name}
                              </p>
                              {log.pairedVehicleId && (
                                  <p className="text-xs font-semibold text-gray-500 mt-0.5">Linked: {log.pairedVehicleId}</p>
                              )}
                              <p className="text-[10px] text-gray-400 font-mono mt-1.5">{new Date(log.timestamp).toLocaleString()}</p>
                          </div>
                      </div>
                  )
              })}
              {filteredLogs.length === 0 && <div className="text-center bg-white p-6 rounded-xl border border-dashed border-gray-300 text-sm font-medium text-gray-400">No logs match your search.</div>}
          </div>
      </div>
    </div>
  );
}
