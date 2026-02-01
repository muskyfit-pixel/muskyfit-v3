import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import IntakeForm from './components/IntakeForm';
import PlanDisplay from './components/PlanDisplay';
import CoachDashboard from './components/CoachDashboard';
import DailyLogging from './components/DailyLogging';
import WorkoutTracker from './components/WorkoutTracker';
import ReadinessHUD from './components/ReadinessHUD';
import MuskyFitSupport from './components/MuskyFitSupport';
import MuskyFitVault from './components/MuskyFitVault';
import ClientProgressSummary from './components/ClientProgressSummary';
import TransformationHub from './components/TransformationHub';
import StrengthMatrix from './components/StrengthMatrix';
import ResourceRadar from './components/ResourceRadar';
import WeeklyReviewView from './components/WeeklyReviewView';
import WeeklyCheckInForm from './components/WeeklyCheckInForm';
import { generatePersonalizedPlan } from './services/geminiService';
import { MOCK_CLIENTS } from './constants';
import { Client, IntakeData } from './types';
import { LayoutDashboard, Flame, ClipboardList, BookOpen, MessageSquare, Target, User, TrendingUp, MapPin, Camera } from 'lucide-react';

const App = () => {
  const [role, setRole] = useState<'COACH' | 'CLIENT'>('CLIENT');
  const [activeTab, setActiveTab] = useState('client-dashboard');
  const [isLoading, setIsLoading] = useState(false);
  
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('muskyfit_db_final');
    return saved ? JSON.parse(saved) : MOCK_CLIENTS;
  });
  
  const [currentClientId, setCurrentClientId] = useState<string | null>(() => {
    return localStorage.getItem('muskyfit_active_id_final') || (clients.length > 0 ? clients[0].id : null);
  });

  useEffect(() => {
    localStorage.setItem('muskyfit_db_final', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    if (currentClientId) {
      localStorage.setItem('muskyfit_active_id_final', currentClientId);
    }
  }, [currentClientId]);

  const currentClient = clients.find(c => c.id === currentClientId) || null;

  const handleIntakeSubmit = async (data: IntakeData) => {
    setIsLoading(true);
    const newId = 'c_' + Date.now();
    const newClient: Client = {
      id: newId,
      profile: { id: 'u_' + newId, name: data.name, role: 'CLIENT', avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${data.name}` },
      intake: data,
      planStatus: 'CONSULTATION_SUBMITTED',
      currentWorkoutIndex: 0,
      exerciseProgress: {},
      personalBests: [],
      logs: [],
      checkIns: [],
      photos: [],
      performanceStatus: 'ON_TRACK'
    };
    setClients(prev => [...prev, newClient]);
    setCurrentClientId(newId);
    setIsLoading(false);
  };

  const handleFinalisePlan = async (clientId: string) => {
    setIsLoading(true);
    try {
      const client = clients.find(c => c.id === clientId);
      if (client?.intake) {
        const plan = await generatePersonalizedPlan(client.intake);
        if (plan) {
          setClients(prev => prev.map(c => c.id === clientId ? { ...c, plan, planStatus: 'PLAN_READY' } : c));
        }
      }
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const updateClientData = (clientId: string, updates: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, ...updates } : c));
  };

  const renderContent = () => {
    if (role === 'COACH') {
      return (
        <CoachDashboard 
          clients={clients} 
          pendingClient={clients.find(c => c.planStatus === 'CONSULTATION_SUBMITTED') || null} 
          onFinalise={handleFinalisePlan}
          onSendReview={() => {}}
          isLoading={isLoading} 
        />
      );
    }
    
    if (!currentClient || currentClient.planStatus === 'NONE') {
      return <IntakeForm onSubmit={handleIntakeSubmit} isLoading={isLoading} />;
    }

    if (currentClient.planStatus === 'CONSULTATION_SUBMITTED') {
      return (
        <div className="max-w-2xl mx-auto text-center py-24 px-6 bg-slate-900/20 rounded-[3rem] border border-white/5 backdrop-blur-xl">
          <div className="w-24 h-24 bg-cyan-600/20 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
            <Target className="text-cyan-500 w-12 h-12" />
          </div>
          <h2 className="text-4xl font-black text-white mb-4 uppercase brand-font">Protocol Synthesis</h2>
          <p className="text-slate-400 mb-10 italic">Your coach is finalizing your bespoke 12-week blueprint.</p>
          <button onClick={() => setRole('COACH')} className="w-full bg-white text-black px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px]">Access Admin</button>
        </div>
      );
    }

    switch (activeTab) {
      case 'log': return <DailyLogging onSave={(log) => updateClientData(currentClient.id, { logs: [log, ...currentClient.logs] })} targetMacros={currentClient.plan?.trainingDayMacros} />;
      case 'plans': return currentClient.plan ? <PlanDisplay mealPlan={currentClient.plan.mealPlan} workoutSplit={currentClient.plan.workoutSplit} trainingDayMacros={currentClient.plan.trainingDayMacros} /> : null;
      case 'concierge': return <MuskyFitSupport client={currentClient} />;
      case 'vault': return <MuskyFitVault />;
      case 'workout': return currentClient.plan ? <WorkoutTracker currentWorkout={currentClient.plan.workoutSplit[currentClient.currentWorkoutIndex]} previousProgress={currentClient.exerciseProgress} onFinish={() => { setActiveTab('client-dashboard'); updateClientData(currentClient.id, { currentWorkoutIndex: (currentClient.currentWorkoutIndex + 1) % currentClient.plan!.workoutSplit.length }); }} /> : null;
      case 'visuals': return <TransformationHub photos={currentClient.photos} onUpload={(photo) => updateClientData(currentClient.id, { photos: [...currentClient.photos, photo] })} biometrics={JSON.stringify(currentClient.intake)} gender={currentClient.intake?.gender} dob={currentClient.intake?.dob} />;
      case 'strength': return <StrengthMatrix pbs={currentClient.personalBests} />;
      case 'radar': return <ResourceRadar />;
      case 'audit': return <WeeklyReviewView reviews={currentClient.checkIns.filter(c => c.review).map(c => c.review!)} />;
      case 'check-in': return <WeeklyCheckInForm onSubmit={(checkIn) => { updateClientData(currentClient.id, { checkIns: [checkIn, ...currentClient.checkIns] }); setActiveTab('client-dashboard'); }} />;
      default: 
        return (
          <div className="space-y-6 pb-32">
            <div className="flex justify-between items-end mb-8">
              <div>
                <p className="text-[10px] text-cyan-500 font-black uppercase tracking-[0.4em] italic mb-1">Status: Elite Active</p>
                <h2 className="text-4xl font-black text-white italic tracking-tighter brand-font uppercase">Hello, {currentClient.profile.name.split(' ')[0]}</h2>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center">
                 <User size={24} className="text-cyan-500" />
              </div>
            </div>

            <ReadinessHUD score={94} sleep={7.8} stress="Optimal" />
            
            <div className="bg-slate-900/40 p-10 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group cursor-pointer" onClick={() => setActiveTab('workout')}>
               <h3 className="text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest italic">Today's Mission</h3>
               <p className="text-3xl font-black text-white mb-8 italic uppercase brand-font">{currentClient.plan?.workoutSplit[currentClient.currentWorkoutIndex]?.title || 'Protocol Rest'}</p>
               <button className="w-full py-5 bg-white text-black font-black uppercase tracking-widest rounded-2xl text-[10px]">Begin Session</button>
            </div>

            <ClientProgressSummary logs={currentClient.logs} />
            
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-slate-900/30 p-8 rounded-[2.5rem] border border-white/5 text-center cursor-pointer" onClick={() => setActiveTab('plans')}>
                  <Flame className="mx-auto mb-4 text-orange-500" />
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Blueprint</p>
               </div>
               <div className="bg-slate-900/30 p-8 rounded-[2.5rem] border border-white/5 text-center cursor-pointer" onClick={() => setActiveTab('vault')}>
                  <BookOpen className="mx-auto mb-4 text-cyan-500" />
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Vault</p>
               </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
               <button onClick={() => setActiveTab('strength')} className="p-4 bg-slate-900/30 rounded-2xl border border-white/5 flex flex-col items-center gap-2">
                  <TrendingUp size={18} className="text-slate-500" />
                  <span className="text-[8px] font-black uppercase">Strength</span>
               </button>
               <button onClick={() => setActiveTab('visuals')} className="p-4 bg-slate-900/30 rounded-2xl border border-white/5 flex flex-col items-center gap-2">
                  <Camera size={18} className="text-slate-500" />
                  <span className="text-[8px] font-black uppercase">Visuals</span>
               </button>
               <button onClick={() => setActiveTab('radar')} className="p-4 bg-slate-900/30 rounded-2xl border border-white/5 flex flex-col items-center gap-2">
                  <MapPin size={18} className="text-slate-500" />
                  <span className="text-[8px] font-black uppercase">Radar</span>
               </button>
            </div>
            
            <button onClick={() => setActiveTab('check-in')} className="w-full py-5 bg-slate-950 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all italic">
               Weekly Performance Check-In
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#020408] text-slate-100 selection:bg-cyan-500/30">
      <Navigation role={role} setRole={setRole} activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="max-w-4xl mx-auto py-8 px-4">
        {renderContent()}
      </main>

      {role === 'CLIENT' && currentClient?.planStatus === 'PLAN_READY' && (
        <div className="fixed bottom-0 left-0 w-full z-50 bottom-nav-glass pb-safe">
           <div className="max-w-md mx-auto h-20 flex justify-around items-center px-4">
              <button onClick={() => setActiveTab('client-dashboard')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'client-dashboard' ? 'text-cyan-400' : 'text-slate-600'}`}>
                <LayoutDashboard size={20} />
                <span className="text-[8px] font-black uppercase">Home</span>
              </button>
              <button onClick={() => setActiveTab('plans')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'plans' ? 'text-cyan-400' : 'text-slate-600'}`}>
                <ClipboardList size={20} />
                <span className="text-[8px] font-black uppercase">Plan</span>
              </button>
              <button onClick={() => setActiveTab('log')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'log' ? 'text-cyan-400' : 'text-slate-600'}`}>
                <div className="w-12 h-12 rounded-full bg-cyan-600 flex items-center justify-center -mt-10 shadow-xl text-white font-bold text-2xl">+</div>
                <span className="text-[8px] font-black uppercase">Log</span>
              </button>
              <button onClick={() => setActiveTab('audit')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'audit' ? 'text-cyan-400' : 'text-slate-600'}`}>
                <TrendingUp size={20} />
                <span className="text-[8px] font-black uppercase">Audit</span>
              </button>
              <button onClick={() => setActiveTab('concierge')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'concierge' ? 'text-cyan-400' : 'text-slate-600'}`}>
                <MessageSquare size={20} />
                <span className="text-[8px] font-black uppercase">Coach</span>
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;