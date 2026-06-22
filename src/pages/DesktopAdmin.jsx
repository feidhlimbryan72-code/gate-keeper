import React, { useEffect, useState } from 'react';
import { getCollection, updateDocument, addDocument, deleteDocument } from '../lib/db';
import { supabase } from '../lib/supabase';
import { 
  Users, ShieldAlert, ShieldCheck, ClipboardList, Trash2, 
  PlusCircle, CheckCircle, Calendar, HelpCircle, UserPlus, 
  ArrowRight, Save, LayoutGrid, ToggleLeft, ToggleRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DesktopAdmin() {
  // Navigation tabs: 'manifest' | 'events' | 'inductions' | 'assignments'
  const [activeTab, setActiveTab] = useState('manifest');
  
  // Roster lists
  const [manifests, setManifests] = useState([]);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [inductions, setInductions] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');

  // Form State: Manifest
  const [newManifestName, setNewManifestName] = useState('');
  const [newManifestCompany, setNewManifestCompany] = useState('');

  // Form State: Events
  const [eventName, setEventName] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDate, setEventDate] = useState('');

  // Selection & Quiz State: Inductions
  const [selectedInductionEventId, setSelectedInductionEventId] = useState('');
  const [briefingSlides, setBriefingSlides] = useState('');
  const [quizQuestions, setQuizQuestions] = useState([]); // array of { question, options: [], correctIndex }
  
  // New Question Form
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionOpts, setNewQuestionOpts] = useState(['', '', '']);
  const [newQuestionCorrectIdx, setNewQuestionCorrectIdx] = useState(0);

  // Selection State: Assignments
  const [selectedAssignmentEventId, setSelectedAssignmentEventId] = useState('');

  // Fetch all collections
  const loadData = async () => {
    try {
      const loadedManifests = await getCollection('manifest');
      const loadedUsers = await getCollection('users');
      const loadedEvents = await getCollection('events');
      const loadedAssignments = await getCollection('event_assignments');
      
      const { data: loadedInductions, error: indErr } = await supabase.from('inductions').select('*');
      if (indErr) throw indErr;

      setManifests(loadedManifests);
      setUsers(loadedUsers);
      setEvents(loadedEvents);
      setAssignments(loadedAssignments);
      setInductions(loadedInductions || []);

      // Auto-set drop-downs
      if (loadedEvents.length > 0) {
        if (!selectedInductionEventId) setSelectedInductionEventId(loadedEvents[0].id);
        if (!selectedAssignmentEventId) setSelectedAssignmentEventId(loadedEvents[0].id);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  // Update builder inputs when selected induction event changes
  useEffect(() => {
    if (!selectedInductionEventId) return;
    const existing = inductions.find(i => i.eventId === selectedInductionEventId);
    if (existing) {
      setBriefingSlides(existing.slides);
      setQuizQuestions(existing.quiz || []);
    } else {
      setBriefingSlides('Welcome to the event safety induction!\n\n---\n\nWear PPE at all times in the logistics area.\n\n---\n\nThe speed limit is 5mph.');
      setQuizQuestions([]);
    }
  }, [selectedInductionEventId, inductions]);

  // -- CRUD Manifest --
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

  const handleWithdrawManifest = async (id) => {
    if(window.confirm("Withdraw this person from the manifest? They will no longer be able to register.")) {
       await deleteDocument('manifest', id);
       loadData();
    }
  };

  // -- CRUD Events --
  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!eventName.trim() || !eventLocation.trim() || !eventDate) return;
    
    // Create the event
    const newEvent = await addDocument('events', {
      name: eventName.trim(),
      location: eventLocation.trim(),
      date: eventDate
    });
    
    if (newEvent && newEvent.id) {
      // Auto-seed a high-quality boilerplate induction & quiz for this event
      const defaultSlides = `### Slide 1: Safety Culture & Irish H&S Law (Safety, Health and Welfare at Work Act 2005)
Under Section 13 of the Safety, Health and Welfare Act 2005, all personnel on site have legal duties:
* **Cooperate**: You must cooperate with site managers and security to ensure safety.
* **Report Hazards**: You must immediately report any safety defects, hazards, or near-misses.
* **SOLAS Safe Pass**: Under the 2013 Construction Regulations, a valid SOLAS Safe Pass card is legally required for anyone performing rigging, staging, crew, or security tasks on this site.

---

### Slide 2: Site Traffic Management & Plant Safety
* **Speed Limits**: The maximum speed limit across the entire event site is strictly **10 km/h**.
* **Reversing Vehicles**: Reversing plant machinery (telehandlers, forklifts, trucks) is a major site hazard. You must cooperate with trained banksmen.
* **Exclusion Zones**: Never enter a vehicle lifting zone or walk directly behind reversing machinery. Keep to marked pedestrian walkways.

---

### Slide 3: Scaffold, Staging & Work at Heights
* **Falls from Height**: Any work involving a risk of falling from heights (staging build, truss rigging, lighting install) must be risk-assessed.
* **Scafftags**: Never climb scaffolding, staging, or temporary demountable structures unless they display a valid green inspection tag (e.g. Scafftag) and you are certified.
* **Fall Protection**: Fall arrest or restraint harness equipment must be worn and anchored correctly when working above 2 meters.

---

### Slide 4: PPE & Emergency Procedures
* **Mandatory PPE**: Steel-toe safety footwear, high-visibility vest (EN ISO 20471), and a safety helmet (EN 397) are mandatory in active work zones.
* **Emergency Evacuation**: In the event of an evacuation alarm, stop work immediately, secure machinery, and walk to the designated **Assembly Point at the Main Entrance Gate**.
* **Incident Reporting**: All accidents, injuries, and near-misses must be logged at the Safety HQ immediately.`;

      const defaultQuiz = [
        {
          question: "Under Section 13 of the Irish Safety, Health and Welfare at Work Act 2005, what is a legal duty of all employees on site?",
          options: [
            "To ignore minor safety defects if they delay work",
            "To report to the employer any defect or hazard in the place or system of work",
            "To only wear PPE if they feel there is an active danger"
          ],
          correctIndex: 1
        },
        {
          question: "Under the Safety, Health and Welfare at Work (Construction) Regulations 2013, who is legally required to hold a valid SOLAS Safe Pass card?",
          options: [
            "Only administrative office staff",
            "Anyone performing rigging, staging, general crew, or site security work",
            "Only external vendors delivering food off-site"
          ],
          correctIndex: 1
        },
        {
          question: "When walking near reversing plant machinery (such as telehandlers or forklifts) on site, what is the mandatory safety requirement?",
          options: [
            "Walk as close to the vehicle as possible so the driver can hear you",
            "Always keep a safe distance, cooperate with a trained banksman, and stick to designated pedestrian paths",
            "Shout loudly at the driver to let them know your position"
          ],
          correctIndex: 1
        },
        {
          question: "Before climbing or working on temporary demountable structures (scaffolding or stages) on an Irish event site, what must you verify?",
          options: [
            "That the structure looks stable from a distance",
            "That the structure has been signed off by a competent inspector and displays a valid inspection tag (e.g. Scafftag)",
            "That you have at least 5 years of climbing experience without safety equipment"
          ],
          correctIndex: 1
        },
        {
          question: "In the event of an emergency evacuation on an event build/break site, what is the correct procedure?",
          options: [
            "Pack up all your personal tools and equipment before leaving the site",
            "Proceed immediately to the designated Assembly Point, keep emergency routes clear, and wait for roll call",
            "Leave the venue immediately in your vehicle to avoid blocking traffic"
          ],
          correctIndex: 1
        }
      ];

      await addDocument('inductions', {
        eventId: newEvent.id,
        title: "Safety Induction Briefing",
        slides: defaultSlides,
        quiz: defaultQuiz
      });
    }

    setEventName('');
    setEventLocation('');
    setEventDate('');
    loadData();
  };

  const handleDeleteEvent = async (id) => {
    if (window.confirm("Are you sure you want to delete this event? This will also remove all inductions and assignments.")) {
      await deleteDocument('events', id);
      loadData();
    }
  };

  // -- CRUD Inductions / Quiz --
  const handleAddQuestion = () => {
    if (!newQuestionText.trim() || newQuestionOpts.some(o => !o.trim())) {
      alert("Please fill out the question and all three answer options.");
      return;
    }
    const newQ = {
      question: newQuestionText.trim(),
      options: newQuestionOpts.map(o => o.trim()),
      correctIndex: newQuestionCorrectIdx
    };
    setQuizQuestions([...quizQuestions, newQ]);
    setNewQuestionText('');
    setNewQuestionOpts(['', '', '']);
    setNewQuestionCorrectIdx(0);
  };

  const handleRemoveQuestion = (idx) => {
    setQuizQuestions(quizQuestions.filter((_, i) => i !== idx));
  };

  const handleSaveInduction = async () => {
    if (!selectedInductionEventId) return;
    try {
      const existing = inductions.find(i => i.eventId === selectedInductionEventId);
      const data = {
        eventId: selectedInductionEventId,
        title: "Safety Induction Briefing",
        slides: briefingSlides,
        quiz: quizQuestions
      };

      if (existing) {
        await updateDocument('inductions', existing.id, data);
      } else {
        await addDocument('inductions', data);
      }
      alert("Safety briefing and quiz saved successfully!");
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to save induction briefing.");
    }
  };

  // -- CRUD Crew Assignments --
  const handleAssignUser = async (userId) => {
    if (!selectedAssignmentEventId) return;
    try {
      await addDocument('event_assignments', {
        userId,
        eventId: selectedAssignmentEventId,
        inductionStatus: false,
        accessStatus: false
      });
      loadData();
    } catch (err) {
      alert("User is already assigned to this event.");
    }
  };

  const handleRemoveAssignment = async (assignId) => {
    if (window.confirm("Remove this crew member from the event?")) {
      await deleteDocument('event_assignments', assignId);
      loadData();
    }
  };

  const handleToggleInductionOverride = async (assignId, currentStatus) => {
    await updateDocument('event_assignments', assignId, {
      inductionStatus: !currentStatus,
      // If passing, auto-enable access. If failing, auto-disable access.
      accessStatus: !currentStatus
    });
    loadData();
  };

  const handleToggleAccessOverride = async (assignId, currentStatus) => {
    await updateDocument('event_assignments', assignId, {
      accessStatus: !currentStatus
    });
    loadData();
  };

  // -- FILTERING & SELECTORS --
  const filteredManifests = manifests.filter(m => 
     m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
     m.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Users already assigned to the selected event
  const assignedUserIds = assignments
    .filter(a => a.eventId === selectedAssignmentEventId)
    .map(a => a.userId);

  // Users not assigned to selected event
  const unassignedUsers = users.filter(u => !assignedUserIds.includes(u.id));

  // Assignment details joined for user interface
  const activeAssignments = assignments
    .filter(a => a.eventId === selectedAssignmentEventId)
    .map(a => {
      const u = users.find(user => user.id === a.userId);
      return {
        ...a,
        userName: u ? u.fullName : 'Unknown User',
        userCompany: u ? u.company : 'Unknown Company',
        userOnSite: u ? u.onSiteStatus : false
      };
    });

  const totalOnSite = users.filter(u => u.onSiteStatus).length;

  return (
    <div className="min-h-screen bg-gray-150 flex flex-col md:flex-row w-full max-w-full font-sans">
      
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-gray-900 text-white flex flex-col shadow-2xl relative z-10 shrink-0">
        <div className="p-6 border-b border-gray-800">
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <ShieldCheck className="w-8 h-8 text-yellow-400" />
                GATE<span className="text-yellow-400">HQ</span>
            </h1>
            <p className="text-gray-400 text-xs font-medium mt-1 uppercase tracking-widest">Admin Dashboard</p>
        </div>

        <nav className="flex-grow p-4 space-y-1.5">
            <button 
              onClick={() => setActiveTab('manifest')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-left ${
                activeTab === 'manifest' ? 'bg-gray-800 text-yellow-400 border-l-4 border-yellow-400' : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
              }`}
            >
                <ClipboardList className="w-5 h-5" /> Crew Manifests
            </button>
            
            <button 
              onClick={() => setActiveTab('events')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-left ${
                activeTab === 'events' ? 'bg-gray-800 text-yellow-400 border-l-4 border-yellow-400' : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
              }`}
            >
                <Calendar className="w-5 h-5" /> Manage Events
            </button>

            <button 
              onClick={() => setActiveTab('inductions')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-left ${
                activeTab === 'inductions' ? 'bg-gray-800 text-yellow-400 border-l-4 border-yellow-400' : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
              }`}
            >
                <HelpCircle className="w-5 h-5" /> H&S Quiz Builder
            </button>

            <button 
              onClick={() => setActiveTab('assignments')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-left ${
                activeTab === 'assignments' ? 'bg-gray-800 text-yellow-400 border-l-4 border-yellow-400' : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
              }`}
            >
                <UserPlus className="w-5 h-5" /> Event Assignments
            </button>
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

      {/* Main Content Pane */}
      <div className="flex-grow flex flex-col overflow-hidden">
         <header className="bg-white shadow-sm px-8 py-5 flex items-center justify-between z-0">
             <div>
                 <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                   {activeTab === 'manifest' && 'Crew Manifest & Access Control'}
                   {activeTab === 'events' && 'Logistics Event Organizer'}
                   {activeTab === 'inductions' && 'Health & Safety Induction Builder'}
                   {activeTab === 'assignments' && 'Crew Event Assignments'}
                 </h2>
                 <p className="text-sm text-gray-500 font-medium mt-0.5">
                   {activeTab === 'manifest' && 'Approve names for contractor crew registration.'}
                   {activeTab === 'events' && 'Create and schedule access zones for events.'}
                   {activeTab === 'inductions' && 'Configure custom reading material and tests per event.'}
                   {activeTab === 'assignments' && 'Add crew members to events and manage compliance overrides.'}
                 </p>
             </div>
             
             <div className="flex items-center gap-6 shrink-0">
                 <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">On-Site Workers</p>
                    <p className="text-3xl font-black text-gray-900">{totalOnSite}</p>
                 </div>
                 <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center border border-yellow-200">
                    <Users className="w-6 h-6 text-yellow-600" />
                 </div>
             </div>
         </header>

         <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                
                {/* TAB 1: MANIFESTS */}
                {activeTab === 'manifest' && (
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                      <div className="xl:col-span-2 bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-900 text-white">
                              <h3 className="text-lg font-black flex items-center gap-2">
                                  <ClipboardList className="w-5 h-5 text-yellow-400" /> Approved Manifest List
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
                                  <button type="submit" className="bg-yellow-400 text-gray-900 font-black px-6 py-3 rounded-xl hover:bg-yellow-500 transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer">
                                     <PlusCircle className="w-5 h-5" /> Add to List
                                  </button>
                              </form>
                          </div>

                          <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                  <thead>
                                      <tr className="bg-gray-100 text-gray-500 text-[10px] uppercase tracking-wider font-bold">
                                          <th className="p-4 pl-6">Worker Name</th>
                                          <th className="p-4">Company</th>
                                          <th className="p-4 text-center">Registration Status</th>
                                          <th className="p-4 pr-6 text-right">Actions</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                      {filteredManifests.map(m => {
                                          const registeredUser = users.find(u => u.fullName.toLowerCase() === m.fullName.toLowerCase() && u.company.toLowerCase() === m.company.toLowerCase());
                                          return (
                                              <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                                                  <td className="p-4 pl-6 font-bold text-gray-900">{m.fullName}</td>
                                                  <td className="p-4 text-sm font-medium text-gray-600">
                                                      <span className="bg-gray-150 px-2.5 py-1 rounded-md border border-gray-200">{m.company}</span>
                                                  </td>
                                                  <td className="p-4 text-center">
                                                      {registeredUser ? (
                                                          <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><CheckCircle className="w-3.5 h-3.5"/> Registered</span>
                                                      ) : (
                                                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Pending Signup</span>
                                                      )}
                                                  </td>
                                                  <td className="p-4 pr-6 text-right">
                                                      <button onClick={() => handleWithdrawManifest(m.id)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors inline-flex items-center gap-1.5 font-bold text-xs cursor-pointer border border-red-100">
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

                      {/* Right Panel: Overview */}
                      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 flex flex-col h-fit">
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                           <LayoutGrid className="w-5 h-5 text-gray-400" /> Database Stats
                        </h3>
                        <div className="space-y-4">
                          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex justify-between items-center">
                            <span className="text-sm font-semibold text-gray-500">Manifest Roster Size</span>
                            <span className="text-xl font-bold text-gray-900">{manifests.length}</span>
                          </div>
                          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex justify-between items-center">
                            <span className="text-sm font-semibold text-gray-500">Registered Digital IDs</span>
                            <span className="text-xl font-bold text-gray-900">{users.length}</span>
                          </div>
                          <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex justify-between items-center">
                            <span className="text-sm font-semibold text-gray-500">Events Scheduled</span>
                            <span className="text-xl font-bold text-gray-900">{events.length}</span>
                          </div>
                        </div>
                      </div>
                  </div>
                )}

                {/* TAB 2: EVENTS */}
                {activeTab === 'events' && (
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Add Event Form */}
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 h-fit">
                      <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-6 flex items-center gap-2 border-b border-gray-100 pb-3">
                        <Calendar className="w-5 h-5 text-yellow-500" /> Create Event
                      </h3>
                      <form onSubmit={handleAddEvent} className="space-y-4">
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Event Name</label>
                          <input 
                            value={eventName}
                            onChange={e=>setEventName(e.target.value)}
                            placeholder="Summer Festival 2026"
                            className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400 font-semibold"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Event Venue / Location</label>
                          <input 
                            value={eventLocation}
                            onChange={e=>setEventLocation(e.target.value)}
                            placeholder="Glastonbury Festival Grounds"
                            className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400 font-semibold"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Event Date</label>
                          <input 
                            type="date"
                            value={eventDate}
                            onChange={e=>setEventDate(e.target.value)}
                            className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400 font-semibold text-gray-700"
                            required
                          />
                        </div>
                        <button type="submit" className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-black py-3 rounded-xl active:scale-95 transition-all text-sm flex items-center justify-center gap-1.5 shadow-md shadow-yellow-400/10 cursor-pointer">
                          <PlusCircle className="w-5 h-5" /> Schedule Event
                        </button>
                      </form>
                    </div>

                    {/* Events Table */}
                    <div className="xl:col-span-2 bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                      <div className="p-6 border-b border-gray-100 bg-gray-900 text-white flex justify-between items-center">
                        <h3 className="text-lg font-black flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-yellow-400" /> Active Events
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-gray-100 text-gray-500 text-[10px] uppercase tracking-wider font-bold">
                              <th className="p-4 pl-6">Event Name</th>
                              <th className="p-4">Location</th>
                              <th className="p-4">Date</th>
                              <th className="p-4 pr-6 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {events.map(ev => (
                              <tr key={ev.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="p-4 pl-6 font-bold text-gray-900">{ev.name}</td>
                                <td className="p-4 text-sm font-semibold text-gray-600">{ev.location}</td>
                                <td className="p-4 text-sm font-mono text-gray-500">{ev.date}</td>
                                <td className="p-4 pr-6 text-right">
                                  <button onClick={() => handleDeleteEvent(ev.id)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors cursor-pointer border border-red-100">
                                    <Trash2 className="w-4 h-4" /> Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {events.length === 0 && (
                              <tr><td colSpan="4" className="p-8 text-center text-gray-400 font-medium">No events scheduled. Create one to begin.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: INDUCTIONS & QUIZZES */}
                {activeTab === 'inductions' && (
                  <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 max-w-5xl mx-auto">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-100 pb-5 mb-6">
                      <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-indigo-500" /> safety Briefing & Quiz Designer
                      </h3>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Event:</span>
                        <select
                          value={selectedInductionEventId}
                          onChange={(e) => setSelectedInductionEventId(e.target.value)}
                          className="bg-gray-100 border-2 border-gray-200 text-gray-800 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-yellow-400 font-bold"
                        >
                          {events.map(ev => (
                            <option key={ev.id} value={ev.id}>{ev.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {events.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 font-medium">
                        No events found. Please create an event first before building its induction slides and quiz.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Slide editor */}
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-bold text-gray-800 mb-1 flex items-center justify-between">
                              <span>Safety Slides Content</span>
                              <span className="text-[10px] text-gray-400 font-normal">Use `---` on a new line to separate slides</span>
                            </h4>
                            <textarea
                              value={briefingSlides}
                              onChange={(e) => setBriefingSlides(e.target.value)}
                              rows="12"
                              placeholder="Slide 1 contents...\n---\nSlide 2 contents...\n---\nSlide 3 contents..."
                              className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 text-xs font-medium outline-none focus:border-yellow-400 text-gray-700 leading-relaxed font-mono"
                            />
                          </div>

                          <button 
                            onClick={handleSaveInduction}
                            className="w-full bg-gray-900 text-yellow-400 hover:bg-gray-800 font-black py-3 rounded-xl transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                          >
                            <Save className="w-4 h-4" /> Save Safety Briefing & Quiz
                          </button>
                        </div>

                        {/* Quiz Builder */}
                        <div className="space-y-6 bg-gray-50 p-6 rounded-2xl border border-gray-200">
                          <div>
                            <h4 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4 flex items-center gap-1.5">
                              <PlusCircle className="w-5 h-5 text-emerald-500" /> Add Quiz Question
                            </h4>
                            
                            <div className="space-y-3">
                              <input 
                                value={newQuestionText}
                                onChange={e=>setNewQuestionText(e.target.value)}
                                placeholder="Enter multiple-choice question..."
                                className="w-full bg-white border-2 border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-yellow-400"
                              />
                              
                              <div className="space-y-2">
                                {newQuestionOpts.map((opt, oIdx) => (
                                  <div key={oIdx} className="flex items-center gap-2">
                                    <input 
                                      value={opt}
                                      onChange={e => {
                                        const updated = [...newQuestionOpts];
                                        updated[oIdx] = e.target.value;
                                        setNewQuestionOpts(updated);
                                      }}
                                      placeholder={`Option ${oIdx + 1}`}
                                      className="flex-grow bg-white border-2 border-gray-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-yellow-400"
                                    />
                                    <button 
                                      type="button"
                                      onClick={() => setNewQuestionCorrectIdx(oIdx)}
                                      className={`px-3 py-2 text-[10px] font-black uppercase rounded-lg border transition-all ${
                                        newQuestionCorrectIdx === oIdx 
                                          ? 'bg-green-100 text-green-800 border-green-300' 
                                          : 'bg-white text-gray-400 border-gray-200 hover:text-gray-600'
                                      }`}
                                    >
                                      Correct
                                    </button>
                                  </div>
                                ))}
                              </div>

                              <button 
                                type="button"
                                onClick={handleAddQuestion}
                                className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                              >
                                <PlusCircle className="w-4 h-4 text-emerald-500" /> Insert Question into Quiz
                              </button>
                            </div>
                          </div>

                          {/* Existing questions preview */}
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Quiz Preview ({quizQuestions.length} Questions)</h4>
                            <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                              {quizQuestions.map((q, idx) => (
                                <div key={idx} className="p-3 bg-white border border-gray-200 rounded-xl flex justify-between items-start gap-2">
                                  <div className="min-w-0">
                                    <h5 className="text-xs font-bold text-gray-900 truncate">{idx + 1}. {q.question}</h5>
                                    <p className="text-[10px] text-green-600 font-semibold mt-1">Ans: {q.options[q.correctIndex]}</p>
                                  </div>
                                  <button onClick={() => handleRemoveQuestion(idx)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors shrink-0">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                              {quizQuestions.length === 0 && (
                                <div className="text-center p-4 text-xs text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                                  No questions built yet. Add questions above.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: EVENT ASSIGNMENTS */}
                {activeTab === 'assignments' && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div>
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Assign Crew to Events</h3>
                        <p className="text-xs text-gray-500 font-medium">Add crew members to events and manage their compliance overrides.</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Event:</span>
                        <select
                          value={selectedAssignmentEventId}
                          onChange={(e) => setSelectedAssignmentEventId(e.target.value)}
                          className="bg-gray-100 border-2 border-gray-200 text-gray-800 rounded-xl px-3 py-2 text-xs outline-none focus:border-yellow-400 font-bold"
                        >
                          {events.map(ev => (
                            <option key={ev.id} value={ev.id}>{ev.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {events.length === 0 ? (
                      <div className="bg-white rounded-3xl p-8 border text-center text-gray-400 font-medium">
                        No events configured. Please create an event first.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Unassigned Pool */}
                        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden flex flex-col h-[550px]">
                          <div className="p-5 border-b border-gray-100 bg-gray-900 text-white">
                            <h4 className="font-black text-sm uppercase tracking-wide flex items-center gap-2">
                              <Users className="w-5 h-5 text-yellow-400" /> Unassigned Crew ({unassignedUsers.length})
                            </h4>
                            <p className="text-[10px] text-gray-400 mt-1">Crew members not yet added to this event.</p>
                          </div>
                          
                          <div className="divide-y divide-gray-100 overflow-y-auto flex-grow">
                            {unassignedUsers.map(u => (
                              <div key={u.id} className="p-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div className="min-w-0">
                                  <p className="font-bold text-gray-900 text-xs truncate">{u.fullName}</p>
                                  <p className="text-[10px] text-gray-500 font-medium">{u.company}</p>
                                </div>
                                <button 
                                  onClick={() => handleAssignUser(u.id)}
                                  className="text-xs bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                                >
                                  Assign <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                            {unassignedUsers.length === 0 && (
                              <div className="p-6 text-center text-xs text-gray-400 font-semibold">
                                All registered crew members are assigned.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Assigned Pool */}
                        <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden flex flex-col h-[550px]">
                          <div className="p-5 border-b border-gray-100 bg-blue-900 text-white">
                            <h4 className="font-black text-sm uppercase tracking-wide flex items-center gap-2">
                              <ShieldCheck className="w-5 h-5 text-blue-400" /> Assigned Crew ({activeAssignments.length})
                            </h4>
                            <p className="text-[10px] text-blue-200 mt-1">Crew members registered, briefing status, and gate clearance.</p>
                          </div>

                          <div className="overflow-auto flex-grow">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-gray-150 text-gray-500 text-[10px] uppercase tracking-wider font-bold border-b border-gray-200">
                                  <th className="p-3 pl-5">Worker / Company</th>
                                  <th className="p-3 text-center">Safety Induction</th>
                                  <th className="p-3 text-center">Site Access</th>
                                  <th className="p-3 pr-5 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {activeAssignments.map(a => (
                                  <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-3 pl-5">
                                      <p className="font-bold text-gray-900 text-xs">{a.userName}</p>
                                      <p className="text-[10px] text-gray-500 font-semibold">{a.userCompany}</p>
                                    </td>
                                    
                                    <td className="p-3 text-center">
                                      <button 
                                        onClick={() => handleToggleInductionOverride(a.id, a.inductionStatus)}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-colors ${
                                          a.inductionStatus 
                                            ? 'bg-green-50 text-green-800 border-green-200 hover:bg-green-100' 
                                            : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100 animate-pulse'
                                        }`}
                                      >
                                        {a.inductionStatus ? 'Passed' : 'Pending'}
                                      </button>
                                    </td>

                                    <td className="p-3 text-center">
                                      <button
                                        onClick={() => handleToggleAccessOverride(a.id, a.accessStatus)}
                                        className="text-gray-800 hover:text-gray-950 p-1 inline-flex items-center gap-1 cursor-pointer"
                                      >
                                        {a.accessStatus ? (
                                          <span className="inline-flex items-center text-green-600 font-bold text-xs"><ToggleRight className="w-6 h-6 text-green-500 mr-1" /> Active</span>
                                        ) : (
                                          <span className="inline-flex items-center text-gray-400 font-bold text-xs"><ToggleLeft className="w-6 h-6 text-gray-300 mr-1" /> Blocked</span>
                                        )}
                                      </button>
                                    </td>

                                    <td className="p-3 pr-5 text-right">
                                      <button 
                                        onClick={() => handleRemoveAssignment(a.id)}
                                        className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors inline-flex items-center cursor-pointer"
                                        title="Unassign"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                                {activeAssignments.length === 0 && (
                                  <tr>
                                    <td colSpan="4" className="p-8 text-center text-gray-400 font-medium text-xs">
                                      No crew members assigned to this event yet.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

            </div>
         </main>
      </div>

    </div>
  );
}
