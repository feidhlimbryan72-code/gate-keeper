import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDocument, getCollection } from '../lib/db';
import { User, Building2, Phone, ArrowRight } from 'lucide-react';

export default function Registration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.target);
    const name = fd.get('fullName').trim();
    const company = fd.get('company').trim();
    
    // Cross-reference with manifest
    const manifest = await getCollection('manifest');
    const isApproved = manifest.some(
      entry => entry.fullName.toLowerCase() === name.toLowerCase() && 
               entry.company.toLowerCase() === company.toLowerCase()
    );

    if (!isApproved) {
      alert(`Access Denied: The name "${name}" under company "${company}" is not found on the contractor manifest. Please contact site administration.`);
      setLoading(false);
      return;
    }

    const data = {
      fullName: name,
      company: company,
      phoneNumber: fd.get('phoneNumber'),
      safetyBriefingStatus: false, // Must be toggled true by admin/guard
      onSiteStatus: false,
    };

    try {
      const user = await addDocument('users', data);
      localStorage.setItem('my_worker_id', user.id);
      navigate(`/id/${user.id}`);
    } catch (err) {
      console.error(err);
      alert("Registration failed");
    }
    setLoading(false);
  };

  return (
    <div className="p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 mt-4">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-tight">Worker<br/>Registration</h1>
        <p className="text-gray-600 mt-3 text-sm font-medium">Create your digital ID to access the festival logistics area.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Full Name</label>
          <div className="relative">
            <User className="absolute left-3.5 top-3.5 text-gray-400 w-5 h-5" />
            <input name="fullName" required className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-400/20 transition-all font-semibold text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-400" placeholder="John Doe" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Company / Crew</label>
          <div className="relative">
            <Building2 className="absolute left-3.5 top-3.5 text-gray-400 w-5 h-5" />
            <input name="company" required className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-400/20 transition-all font-semibold text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-400" placeholder="Main Stage Audio Ltd" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Mobile Number</label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-3.5 text-gray-400 w-5 h-5" />
            <input name="phoneNumber" type="tel" required className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-400/20 transition-all font-semibold text-gray-900 outline-none placeholder:font-normal placeholder:text-gray-400" placeholder="+44 7700 900000" />
          </div>
        </div>

        <div className="pt-4">
          <button disabled={loading} type="submit" className="w-full cursor-pointer bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-black py-4 px-6 rounded-xl shadow-[0_4px_14px_0_rgba(250,204,21,0.39)] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 group text-lg">
            {loading ? 'Processing...' : 'Generate Digital ID'}
            {!loading && <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />}
          </button>
        </div>
      </form>
    </div>
  );
}
