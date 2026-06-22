import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDocument, getAssignmentForUserAndEvent, updateDocument } from '../lib/db';
import { supabase } from '../lib/supabase';
import { ShieldCheck, ArrowRight, ArrowLeft, HelpCircle, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

export default function InductionFlow() {
  const { eventId, userId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [event, setEvent] = useState(null);
  const [induction, setInduction] = useState(null);
  const [assignment, setAssignment] = useState(null);
  
  const [step, setStep] = useState('reading'); // 'reading' or 'quiz' or 'success'
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slides, setSlides] = useState([]);
  
  const [answers, setAnswers] = useState({}); // { questionIndex: selectedOptionIndex }
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [wrongQuestions, setWrongQuestions] = useState([]); // indices of wrong answers

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Load event
        const ev = await getDocument('events', eventId);
        if (!ev) throw new Error("Event not found.");
        setEvent(ev);

        // Load user assignment
        const assign = await getAssignmentForUserAndEvent(userId, eventId);
        if (!assign) throw new Error("You are not assigned to this event. Please contact admin.");
        setAssignment(assign);

        if (assign.inductionStatus) {
          setStep('success');
        }

        // Load induction briefing
        const { data: ind, error: indErr } = await supabase
          .from('inductions')
          .select('*')
          .eq('eventId', eventId)
          .maybeSingle();
        
        if (indErr) throw indErr;
        
        if (!ind) {
          throw new Error("No induction briefing is configured for this event yet.");
        }
        setInduction(ind);

        // Parse safety slides (split by markdown separator or double newlines)
        const parsedSlides = ind.slides
          .split('---')
          .map(s => s.trim())
          .filter(Boolean);
        
        setSlides(parsedSlides.length > 0 ? parsedSlides : [ind.slides]);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load safety briefing.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [eventId, userId]);

  const handleNextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    } else {
      setStep('quiz');
    }
  };

  const handlePrevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const handleSelectOption = (qIdx, optIdx) => {
    if (quizSubmitted) return; // disable editing after submit unless reset
    setAnswers({
      ...answers,
      [qIdx]: optIdx
    });
  };

  const handleSubmitQuiz = async (e) => {
    e.preventDefault();
    if (!induction || !induction.quiz) return;
    
    const quizQuestions = induction.quiz;
    let correctCount = 0;
    const wrong = [];

    quizQuestions.forEach((q, idx) => {
      const selected = answers[idx];
      if (selected === q.correctIndex) {
        correctCount++;
      } else {
        wrong.push(idx);
      }
    });

    setScore(correctCount);
    setWrongQuestions(wrong);
    setQuizSubmitted(true);

    if (wrong.length === 0) {
      // 100% score, pass induction!
      try {
        await updateDocument('event_assignments', assignment.id, {
          inductionStatus: true,
          accessStatus: true
        });
        setStep('success');
      } catch (err) {
        alert("Failed to update status. Please try again.");
      }
    }
  };

  const handleRetryQuiz = () => {
    setAnswers({});
    setQuizSubmitted(false);
    setWrongQuestions([]);
    setStep('quiz');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-t-yellow-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        </div>
        <p className="mt-4 text-slate-400 font-medium animate-pulse">Loading Safety Briefing...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="p-4 bg-red-950/40 border border-red-800/50 rounded-2xl mb-4 max-w-sm">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-2" />
          <h3 className="text-lg font-bold text-red-200">Access Restricted</h3>
          <p className="text-red-300 text-xs mt-1 leading-relaxed">{error}</p>
        </div>
        <button 
          onClick={() => navigate(`/id/${userId}`)}
          className="text-sm font-bold text-slate-400 hover:text-white transition-colors"
        >
          Return to Digital ID
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col relative overflow-hidden font-sans">
      {/* Background visual glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-yellow-400/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Header */}
      <header className="p-5 border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-10 flex justify-between items-center">
        <div>
          <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">H&S Briefing</span>
          <h2 className="text-sm font-black text-white truncate max-w-[200px]">{event.name}</h2>
        </div>
        <button 
          onClick={() => navigate(`/id/${userId}`)}
          className="text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-white"
        >
          Exit
        </button>
      </header>

      <main className="flex-1 flex flex-col p-6 max-w-md mx-auto w-full justify-center">
        {step === 'reading' && (
          <div className="flex flex-col h-full justify-between gap-8">
            {/* Progress indicator */}
            <div className="w-full bg-slate-900 rounded-full h-1.5 flex overflow-hidden">
              {slides.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-full flex-1 transition-all duration-300 border-r border-slate-950 last:border-0 ${idx <= currentSlideIndex ? 'bg-yellow-400' : 'bg-slate-800'}`}
                />
              ))}
            </div>

            {/* Slide Content */}
            <div className="flex-1 flex flex-col justify-center py-6">
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-850 rounded-3xl p-6 min-h-[280px] flex flex-col justify-between shadow-xl">
                <div className="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {slides[currentSlideIndex]}
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right mt-6">
                  Slide {currentSlideIndex + 1} of {slides.length}
                </div>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-4">
              {currentSlideIndex > 0 ? (
                <button 
                  onClick={handlePrevSlide}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 font-bold py-3.5 rounded-xl active:scale-[0.98] transition-all text-sm"
                >
                  <ArrowLeft className="w-4 h-4" /> Previous
                </button>
              ) : (
                <div className="flex-1" />
              )}
              <button 
                onClick={handleNextSlide}
                className="flex-1 flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-3.5 rounded-xl active:scale-[0.98] transition-all text-sm shadow-lg shadow-yellow-400/10"
              >
                {currentSlideIndex === slides.length - 1 ? 'Start Quiz' : 'Next'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 'quiz' && (
          <form onSubmit={handleSubmitQuiz} className="space-y-6">
            <div className="text-center mb-2">
              <HelpCircle className="w-10 h-10 text-yellow-400 mx-auto mb-2" />
              <h3 className="text-xl font-bold text-white">Event Safety Quiz</h3>
              <p className="text-slate-400 text-xs mt-1">Answer all questions correctly to activate your site clearance.</p>
            </div>

            <div className="space-y-6 max-h-[420px] overflow-y-auto pr-1">
              {induction.quiz.map((q, qIdx) => {
                const isWrong = quizSubmitted && wrongQuestions.includes(qIdx);
                const isCorrect = quizSubmitted && !wrongQuestions.includes(qIdx);
                
                return (
                  <div 
                    key={qIdx} 
                    className={`p-5 rounded-2xl border transition-all ${
                      isWrong 
                        ? 'bg-red-950/20 border-red-800/40 shadow-lg shadow-red-900/5' 
                        : isCorrect 
                        ? 'bg-green-950/20 border-green-800/40' 
                        : 'bg-slate-900/60 border-slate-850'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <h4 className="font-bold text-sm text-slate-100">{qIdx + 1}. {q.question}</h4>
                      {isWrong && <span className="text-[10px] font-black uppercase text-red-400 bg-red-900/30 px-2 py-0.5 rounded">Wrong</span>}
                      {isCorrect && <span className="text-[10px] font-black uppercase text-green-400 bg-green-900/30 px-2 py-0.5 rounded">Correct</span>}
                    </div>

                    <div className="space-y-2">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = answers[qIdx] === optIdx;
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => handleSelectOption(qIdx, optIdx)}
                            className={`w-full text-left p-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-between border cursor-pointer ${
                              isSelected
                                ? 'bg-yellow-400 text-gray-900 border-yellow-400 shadow-md shadow-yellow-400/10'
                                : 'bg-slate-950/80 text-slate-300 hover:text-white border-slate-850 hover:bg-slate-900'
                            }`}
                          >
                            <span>{opt}</span>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-gray-900 bg-white' : 'border-slate-700'}`}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-gray-900" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {quizSubmitted && wrongQuestions.length > 0 ? (
              <div className="p-4 bg-red-950/40 border border-red-800/50 rounded-xl text-center space-y-3">
                <p className="text-red-300 text-xs font-semibold">
                  You got {wrongQuestions.length} question(s) incorrect. Please review safety rules.
                </p>
                <button
                  type="button"
                  onClick={handleRetryQuiz}
                  className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer"
                >
                  Retry Quiz
                </button>
              </div>
            ) : (
              <button
                type="submit"
                disabled={Object.keys(answers).length < induction.quiz.length}
                className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-3.5 rounded-xl active:scale-[0.98] transition-all text-sm disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-yellow-400/10"
              >
                Submit Answers
              </button>
            )}
          </form>
        )}

        {step === 'success' && (
          <div className="text-center py-8 space-y-6 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-green-500/10 text-green-400 rounded-3xl flex items-center justify-center mx-auto border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.15)]">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            
            <div>
              <h3 className="text-2xl font-black text-white">Induction Completed!</h3>
              <p className="text-slate-400 text-xs mt-2 max-w-[280px] mx-auto leading-relaxed">
                You have passed the safety briefing for **{event.name}**. Your site access clearance is now active.
              </p>
            </div>

            <button
              onClick={() => navigate(`/id/${userId}`)}
              className="px-6 py-3.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-white font-bold rounded-xl text-sm transition-all w-full max-w-[200px] active:scale-95"
            >
              Show Digital ID
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
