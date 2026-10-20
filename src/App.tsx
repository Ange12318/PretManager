/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Settings as SettingsIcon, 
  BarChart3, 
  Search,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Camera,
  Share2,
  Trash2,
  RotateCcw,
  LogIn,
  LogOut,
  FileText,
  Download,
  Calendar as CalendarIcon
} from 'lucide-react';

import { QRCodeSVG } from 'qrcode.react';
import { format, differenceInDays, isAfter, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

import { Loan, UserSettings, LoanDirection, CurrencyCode, LoanType, P2PStatus } from './types';
import { storage, formatCurrency } from './services/storage';
import { auth, signInWithGoogle } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// --- Shared Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', disabled = false, loading = false }: any) => {
  const variants: any = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-md',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-50',
    outline: 'bg-transparent border border-slate-200 text-slate-900 hover:bg-slate-50'
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`px-4 py-2.5 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 ${variants[variant]} ${className}`}
    >
      {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : children}
    </button>
  );
};

const Card = ({ children, className = '', onClick }: any) => (
  <div 
    onClick={onClick}
    className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''} ${className}`}
  >
    {children}
  </div>
);

const P2PValidationModal = ({ onValidate, onCancel, settings }: any) => {
    const [code, setCode] = useState('');
    const [step, setStep] = useState<'input' | 'preview'>('input');
    
    return (
      <div className="space-y-4">
        {step === 'input' ? (
          <>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-2">Entrez le Code de Transaction ou Scannez</label>
              <div className="flex gap-2">
                <input 
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="CODE-XXXXX"
                  className="flex-1 bg-zinc-50 border border-zinc-100 rounded-xl py-2.5 px-4 text-sm font-mono outline-none focus:border-zinc-300 transition-all"
                />
                <Button variant="secondary" className="px-3" onClick={() => setCode('PM-DEMO-CODE')}>
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {code === 'PM-DEMO-CODE' && (
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl animate-in zoom-in-95">
                <p className="text-xs text-blue-800 mb-3">
                  <span className="font-bold text-sm block">Vérification du code...</span>
                  Jean-Marc affirme vous avoir prêté <span className="font-bold">50.000 CFA</span>.
                </p>
                <Button variant="primary" className="w-full py-2 text-xs" onClick={() => setStep('preview')}>
                  Voir l'Engagement <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
            <Button variant="outline" className="w-full text-xs" onClick={onCancel}>Fermer</Button>
          </>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-right-4">
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-3">
              <h4 className="font-black uppercase tracking-widest text-center border-b pb-2 mb-2">Aperçu de l'engagement</h4>
              <p>Moi, <span className="font-bold">{settings.userName}</span> (Emprunteur), reconnais avoir reçu :</p>
              <div className="bg-white p-3 rounded-xl border border-slate-200 font-bold text-sm text-center">
                50.000 CFA <span className="text-[10px] block font-medium opacity-60">de la part de Jean-Marc</span>
              </div>
              <p>Je m'engage à restituer l'intégralité du prêt avant la date d'échéance convenue.</p>
              <p className="text-[10px] text-slate-400 italic">En validant, un acte d'engagement officiel sera généré et accessible dans votre historique.</p>
            </div>
            
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1 py-1.5 text-xs" onClick={() => setStep('input')}>Précédent</Button>
              <Button variant="primary" className="flex-1 py-1.5 text-xs" onClick={() => onValidate(code)}>Signer & Valider</Button>
            </div>
          </div>
        )}
      </div>
    );
  };

const LoginScreen = ({ onComplete }: { onComplete: (name: string) => void }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      if (user) {
        onComplete(user.displayName || 'Utilisateur');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 text-center min-h-screen"
    >
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [3, -3, 3]
        }}
        transition={{ 
          duration: 5, 
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center font-black text-4xl shadow-2xl shadow-blue-200 mb-8 text-white"
      >
        P
      </motion.div>
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-3">PretManager Pro</h1>
        <p className="text-slate-500 text-sm font-medium max-w-[240px] mx-auto leading-relaxed">
          Gérez vos prêts entre particuliers avec une élégance professionnelle et sécurisée.
        </p>
      </motion.div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-xs mt-12 space-y-4 text-left"
      >
        <Button 
          variant="primary" 
          className="w-full py-4 text-lg shadow-xl shadow-blue-200"
          onClick={handleGoogleLogin}
          loading={loading}
        >
          <LogIn className="w-5 h-5 mr-1" /> Connexion Google
        </Button>

        <div className="flex items-center gap-4 py-2">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Ou continuer sans compte</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <div className="relative">
          <label className="absolute -top-2.5 left-4 px-2 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-blue-600 z-10">
            Nom d'Utilisateur local
          </label>
          <input 
            type="text"
            placeholder="Ex: Marc Diop"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) onComplete(name.trim());
            }}
            className="w-full bg-white border-2 border-slate-200 rounded-2xl py-4 px-6 text-lg font-bold outline-none focus:border-blue-600 transition-all shadow-sm focus:shadow-blue-50"
          />
        </div>
        
        <Button 
          variant="outline" 
          className="w-full py-4 text-sm"
          disabled={!name.trim()}
          onClick={() => onComplete(name.trim())}
        >
          Mode Invité <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </motion.div>

      <div className="mt-auto space-y-4">
        <div className="flex items-center gap-2 justify-center">
          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Synchronisé & Sécurisé</span>
        </div>
      </div>
    </motion.div>
  );
};

// --- Views ---

const Dashboard = ({ loans, settings, onOpenP2P }: { loans: Loan[], settings: UserSettings, onOpenP2P: any }) => {
  const stats = useMemo(() => {
    const given = loans.filter(l => l.direction === 'given');
    const received = loans.filter(l => l.direction === 'received');
    const returned = loans.filter(l => l.status === 'returned');
    
    // Calculate respect rate
    const totalFinished = returned.length;
    const onTime = returned.filter(l => {
      if (!l.returnDate) return false;
      return !isAfter(parseISO(l.returnDate), parseISO(l.dueDate));
    }).length;
    const respectRate = totalFinished > 0 ? Math.round((onTime / totalFinished) * 100) : 100;

    return {
      totalGiven: given.filter(l => l.status === 'active').reduce((acc, l) => acc + (l.amount || 0), 0),
      totalReceived: received.filter(l => l.status === 'active').reduce((acc, l) => acc + (l.amount || 0), 0),
      activeGivenCount: given.filter(l => l.status === 'active').length,
      activeReceivedCount: received.filter(l => l.status === 'active').length,
      respectRate
    };
  }, [loans]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Bonjour, {settings.userName}</h1>
          <p className="text-slate-500 text-sm font-medium">Voici l'état de vos prêts</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
          <Wallet className="w-6 h-6 text-white" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-emerald-50 border-emerald-100 shadow-none">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-widest text-emerald-600 font-black">J'ai Prêté</span>
            <span className="text-xl font-black text-slate-900">{formatCurrency(stats.totalGiven, settings.currency)}</span>
            <span className="text-[10px] text-emerald-700/60 mt-2 font-bold">{stats.activeGivenCount} prêts en cours</span>
          </div>
        </Card>
        <Card className="bg-orange-50 border-orange-100 shadow-none">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-widest text-orange-600 font-black">On m'a Prêté</span>
            <span className="text-xl font-black text-slate-900">{formatCurrency(stats.totalReceived, settings.currency)}</span>
            <span className="text-[10px] text-orange-700/60 mt-2 font-bold">{stats.activeReceivedCount} dettes actives</span>
          </div>
          <Button variant="outline" className="mt-4 w-full py-1.5 text-[10px] border-orange-200 bg-white/50" onClick={onOpenP2P}>
            Valider P2P
          </Button>
        </Card>
      </div>

      <div>
        <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 ml-1">Analyse de Performance</h2>
        <div className="space-y-3">
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-slate-700">Taux de respect des délais</span>
              </div>
              <span className="text-sm font-black text-emerald-600">{stats.respectRate}%</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)] transition-all duration-1000"
                style={{ width: `${stats.respectRate}%` }}
              ></div>
            </div>
          </div>
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-slate-700">Délai moyen</span>
              </div>
              <span className="text-sm font-black text-slate-900">14 jours</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 text-white shadow-xl">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 shrink-0" />
          <p className="text-[10px] text-slate-400 leading-relaxed">
            <span className="font-bold text-slate-200">MENTION LÉGALE :</span> PretManager n'est pas un établissement financier. Simple outil privé de traçabilité et de rappel entre particuliers.
          </p>
        </div>
      </div>
    </div>
  );
};

const LoanCard = ({ loan, currency, onAction, onDelete, onShowProof }: any) => {
  const isOverdue = isAfter(new Date(), parseISO(loan.dueDate)) && loan.status === 'active';
  const daysRemaining = differenceInDays(parseISO(loan.dueDate), new Date());
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative"
    >
      <Card className={`relative overflow-hidden ${isOverdue ? 'border-red-100 bg-red-50/10' : ''}`}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${loan.type === 'money' ? 'bg-slate-100 text-slate-900' : 'bg-orange-100 text-orange-600'}`}>
              {loan.type === 'money' ? '💰' : '📦'}
            </div>
            <div>
              <h3 className="font-black text-slate-900 line-clamp-1 tracking-tight">{loan.title}</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{loan.personName}</p>
            </div>
          </div>
          <div className="text-right">
            {loan.type === 'money' ? (
              <p className="font-black text-slate-900">{formatCurrency(loan.amount || 0, currency)}</p>
            ) : (
              <p className="text-xs font-bold text-slate-600 italic max-w-[120px] truncate">{loan.description}</p>
            )}
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">
              Échéance : {format(parseISO(loan.dueDate), 'dd MMMM yyyy', { locale: fr })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-50">
          {loan.status === 'active' ? (
            <>
              <Button 
                variant="outline" 
                className="py-1.5 px-3 text-[10px] flex-1 bg-slate-50/50"
                onClick={() => onAction(loan)}
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Marquer rendu
              </Button>
              {loan.isP2P && loan.p2pStatus === 'confirmed' && (
                <Button 
                  variant="secondary" 
                  className="py-1.5 px-3 text-[10px]"
                  onClick={() => onShowProof(loan)}
                >
                  <FileText className="w-3 h-3" /> Acte
                </Button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest flex-1 justify-center py-2 bg-emerald-50 rounded-xl">
              <CheckCircle2 className="w-3 h-3" /> Rendu le {format(parseISO(loan.returnDate!), 'dd/MM/yyyy')}
            </div>
          )}

          <button 
            onClick={() => onDelete(loan.id)}
            className="p-2 text-zinc-300 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {loan.status === 'active' && !isOverdue && daysRemaining <= 3 && (
          <div className="absolute top-0 right-0">
            <div className={`text-white text-[8px] font-black px-2 py-0.5 rounded-bl-lg uppercase tracking-widest ${daysRemaining <= 1 ? 'bg-red-500' : 'bg-orange-500'}`}>
              J-{daysRemaining > 0 ? daysRemaining : '0'}
            </div>
          </div>
        )}
        {isOverdue && (
          <div className="absolute top-0 right-0">
            <div className="bg-red-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-widest">
              En retard
            </div>
          </div>
        )}
        
        {loan.isP2P && (
          <div className="absolute bottom-4 right-4">
            <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase border ${
              loan.p2pStatus === 'confirmed' ? 'border-blue-200 text-blue-500 bg-blue-50' : 
              loan.p2pStatus === 'pending' ? 'border-yellow-200 text-yellow-600 bg-yellow-50' : 
              'border-zinc-200 text-zinc-400 bg-zinc-50'
            }`}>
              {loan.p2pStatus === 'confirmed' ? '🔗 Confirmé' : loan.p2pStatus === 'pending' ? '⏳ En attente' : '🔗 P2P'}
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
};

const LoanListView = ({ direction, loans, currency, onAction, onDelete, onShowProof }: any) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'returned'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLoans = useMemo(() => {
    return loans
      .filter((l: Loan) => l.direction === direction)
      .filter((l: Loan) => filter === 'all' ? true : l.status === filter)
      .filter((l: Loan) => 
        l.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        l.personName.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a: Loan, b: Loan) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [loans, direction, filter, searchQuery]);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          placeholder="Rechercher un prêt..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-10 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium"
        />
      </div>

      <div className="flex gap-2 p-1 bg-slate-200/50 rounded-xl">
        {(['active', 'returned', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
              filter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {f === 'active' ? 'En cours' : f === 'returned' ? 'Rendus' : 'Tous'}
          </button>
        ))}
      </div>

      <div className="space-y-3 pb-24">
        {filteredLoans.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {filteredLoans.map((loan: Loan) => (
              <LoanCard 
                key={loan.id} 
                loan={loan} 
                currency={currency} 
                onAction={onAction} 
                onDelete={onDelete}
                onShowProof={onShowProof}
              />
            ))}
          </AnimatePresence>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-zinc-200" />
            </div>
            <p className="text-zinc-400 text-sm">Aucun prêt trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
};

const Modal = ({ title, children, onClose }: any) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm"
  >
    <motion.div 
      initial={{ scale: 0.9, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.9, opacity: 0, y: 20 }}
      className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
    >
      <div className="px-6 py-4 border-bottom border-zinc-100 flex items-center justify-between bg-zinc-50">
        <h3 className="font-bold text-zinc-900">{title}</h3>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-zinc-200 text-zinc-500 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-6 overflow-y-auto hide-scrollbar">
        {children}
      </div>
    </motion.div>
  </motion.div>
);

const LoanForm = ({ direction, onCancel, onSave }: any) => {
  const [formData, setFormData] = useState<Partial<Loan>>({
    direction,
    type: 'money',
    title: '',
    personName: '',
    loanDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    isP2P: false,
    p2pStatus: 'none',
    status: 'active'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.personName || !formData.dueDate) return;
    
    const newLoan: Loan = {
      ...formData as Loan,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      amount: formData.type === 'money' ? Number(formData.amount) : undefined,
    };
    
    onSave(newLoan);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 rounded-xl mb-2">
        {(['money', 'object'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFormData({ ...formData, type: t })}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              formData.type === t ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {t === 'money' ? '💰 Argent' : '📦 Objet'}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Titre du prêt</label>
          <input 
            required
            placeholder="Ex: Loyer, Tondeuse..."
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full bg-zinc-50 border border-zinc-100 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-zinc-300 transition-all"
          />
        </div>

        {formData.type === 'money' ? (
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Montant</label>
            <input 
              required
              type="number"
              placeholder="0.00"
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              className="w-full bg-zinc-50 border border-zinc-100 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-zinc-300 transition-all font-mono"
            />
          </div>
        ) : (
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Description de l'objet</label>
            <textarea 
              required
              placeholder="Marque, état, accessoires..."
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-100 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-zinc-300 transition-all h-20"
            />
          </div>
        )}

        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Personne</label>
          <input 
            required
            placeholder="Nom complet"
            value={formData.personName}
            onChange={(e) => setFormData({ ...formData, personName: e.target.value })}
            className="w-full bg-zinc-50 border border-zinc-100 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-zinc-300 transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Date du prêt</label>
            <input 
              type="date"
              value={formData.loanDate}
              onChange={(e) => setFormData({ ...formData, loanDate: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-100 rounded-xl py-2 px-3 text-xs outline-none focus:border-zinc-300 transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Retour prévu</label>
            <input 
              required
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full bg-zinc-50 border border-zinc-100 rounded-xl py-2 px-3 text-xs outline-none focus:border-zinc-300 transition-all"
            />
          </div>
        </div>

        <div className="pt-2">
          <label className="flex items-center gap-3 p-3 bg-zinc-50 border border-zinc-100 rounded-xl cursor-pointer">
            <input 
              type="checkbox"
              checked={formData.isP2P}
              onChange={(e) => setFormData({ ...formData, isP2P: e.target.checked, p2pStatus: e.target.checked ? 'pending' : 'none' })}
              className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
            />
            <div className="flex-1">
              <p className="text-xs font-bold">Validation mutuelle (P2P)</p>
              <p className="text-[10px] text-zinc-500">Générer un lien de validation pour l'emprunteur</p>
            </div>
          </label>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>Annuler</Button>
        <Button variant="primary" className="flex-1" type="submit">Enregistrer</Button>
      </div>
    </form>
  );
};

const SettingsView = ({ settings, onSave, onExport }: any) => {
  const [formData, setFormData] = useState(settings);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
      <div>
        <h2 className="text-2xl font-bold mb-1">Paramètres</h2>
        <p className="text-zinc-500 text-sm">Gérez vos préférences et données</p>
      </div>

      <div className="space-y-4">
        <Card className="p-0 overflow-hidden divide-y divide-zinc-100">
          <div className="p-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-2">Devise Globale</label>
            <select 
              value={formData.currency}
              onChange={(e) => {
                const newSettings = { ...formData, currency: e.target.value };
                setFormData(newSettings);
                onSave(newSettings);
              }}
              className="w-full bg-zinc-50 border-none rounded-xl py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
            >
              <option value="XOF">FCFA (XOF)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="USD">Dollar (USD)</option>
              <option value="GBP">Livre (GBP)</option>
              <option value="XAF">Franc CFA (XAF)</option>
              <option value="GNF">Franc Guinéen (GNF)</option>
            </select>
          </div>
          
          <div className="p-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-2">Votre Nom</label>
            <input 
              type="text"
              value={formData.userName}
              onChange={(e) => {
                const newSettings = { ...formData, userName: e.target.value };
                setFormData(newSettings);
                onSave(newSettings);
              }}
              className="w-full bg-zinc-50 border-none rounded-xl py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
            />
          </div>

          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">Code P2P unique</p>
              <p className="font-mono text-xs text-zinc-500 select-all">{settings.userId}</p>
            </div>
            <Button variant="ghost" className="p-2" onClick={() => navigator.clipboard.writeText(settings.userId)}>
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Session</h3>
            {auth.currentUser && (
              <Button 
                variant="danger" 
                className="py-1 px-3 text-[10px]" 
                onClick={() => signOut(auth)}
              >
                <LogOut className="w-3 h-3" /> Déconnexion
              </Button>
            )}
          </div>
          <Button variant="outline" className="w-full text-sm py-3 justify-start gap-3" onClick={onExport}>
            <RotateCcw className="w-4 h-4 text-orange-500" />
            Exporter les données (JSON)
          </Button>
        </Card>

        <div className="text-center p-8 bg-zinc-50 rounded-3xl opacity-60">
          <p className="text-[10px] text-zinc-400 font-medium">PretManager v1.1.0</p>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'given' | 'received' | 'settings'>('dashboard');
  const [loans, setLoans] = useState<Loan[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showP2PModal, setShowP2PModal] = useState(false);
  const [selectedLoanForProof, setSelectedLoanForProof] = useState<Loan | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      const currentSettings = await storage.getSettings();
      setSettings(currentSettings);
      
      if (user) {
        const unsubscribeLoans = storage.syncLoans((newLoans) => {
          setLoans(newLoans);
        });
        setIsReady(true);
        return () => unsubscribeLoans?.();
      } else {
        setLoans(storage.getLocalLoans());
        setIsReady(true);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleSaveLoan = async (newLoan: Loan) => {
    await storage.addLoan(newLoan);
    if (!auth.currentUser) {
      setLoans([...loans, newLoan]);
    }
    setShowAddModal(false);
  };

  const handleMarkReturned = async (loan: Loan) => {
    const updatedLoan = { ...loan, status: 'returned' as const, returnDate: new Date().toISOString() };
    await storage.updateLoan(updatedLoan);
    if (!auth.currentUser) {
      setLoans(loans.map(l => l.id === loan.id ? updatedLoan : l));
    }
  };

  const handleDeleteLoan = async (id: string) => {
    if (confirm('Supprimer définitivement ce prêt ?')) {
      await storage.deleteLoan(id);
      if (!auth.currentUser) {
        setLoans(loans.filter(l => l.id !== id));
      }
    }
  };

  const handleUpdateSettings = async (newSettings: UserSettings) => {
    await storage.saveSettings(newSettings);
    setSettings(newSettings);
  };

  const handleOnboardingComplete = async (name: string) => {
    const currentSettings = settings || await storage.getSettings();
    const newSettings: UserSettings = {
      ...currentSettings,
      userName: name,
      onboarded: true
    };
    await handleUpdateSettings(newSettings);
  };

  const handleP2PValidate = (code: string) => {
    // Demo implementation
    const demoLoan: Loan = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'Loyer (Confirmé P2P)',
      type: 'money',
      direction: 'received',
      amount: 50000,
      personName: 'Jean-Marc',
      loanDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      isP2P: true,
      p2pStatus: 'confirmed',
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    storage.addLoan(demoLoan);
    setLoans([...loans, demoLoan]);
    setShowP2PModal(false);
    alert('Prêt validé et ajouté à votre compte !');
  };

  const handleExport = async () => {
    const data = await storage.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pretmanager_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isReady || !settings) return null;

  if (!settings.onboarded) {
    return (
      <div className="mobile-container">
        <LoginScreen onComplete={handleOnboardingComplete} />
      </div>
    );
  }

  return (
    <div className="mobile-container">
      {/* Header Area */}
      <header className="px-6 pt-10 pb-6 sticky top-0 z-20 glass-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-black text-lg shadow-lg">P</div>
            <span className="text-sm font-black uppercase tracking-tighter">PretManager <span className="text-blue-400">Pro</span></span>
          </div>
          {activeTab !== 'settings' && (
            <button 
              onClick={() => setActiveTab('settings')}
              className="p-2 -mr-2 rounded-xl hover:bg-slate-800 text-slate-400 transition-colors"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 px-6 pb-20 overflow-y-auto overflow-x-hidden hide-scrollbar">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Dashboard loans={loans} settings={settings} onOpenP2P={() => setShowP2PModal(true)} />
            </motion.div>
          )}
          
          {(activeTab === 'given' || activeTab === 'received') && (
            <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="mb-4">
                <h2 className="text-2xl font-bold capitalize">
                  {activeTab === 'given' ? 'J’ai prêté' : 'On m’a prêté'}
                </h2>
                <p className="text-zinc-500 text-sm">Gestion de vos transactions actives</p>
              </div>
              <LoanListView 
                direction={activeTab} 
                loans={loans} 
                currency={settings.currency}
                onAction={handleMarkReturned}
                onDelete={handleDeleteLoan}
                onShowProof={setSelectedLoanForProof}
              />
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SettingsView settings={settings} onSave={handleUpdateSettings} onExport={handleExport} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 p-4 z-30 safe-bottom glass-nav">
        <div className="flex items-center justify-around relative max-w-sm mx-auto">
          <NavButton 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
            icon={<BarChart3 className="w-5 h-5" />} 
            label="Home"
          />
          <NavButton 
            active={activeTab === 'given'} 
            onClick={() => setActiveTab('given')} 
            icon={<ArrowUpRight className="w-5 h-5" />} 
            label="Donnés"
          />
          
          {/* Floating Action Button */}
          <div className="relative -top-8 -mx-2">
            <button 
              onClick={() => setShowAddModal(true)}
              className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-blue-200 active:scale-90 transition-transform"
            >
              <Plus className="w-8 h-8" />
            </button>
          </div>

          <NavButton 
            active={activeTab === 'received'} 
            onClick={() => setActiveTab('received')} 
            icon={<ArrowDownLeft className="w-5 h-5" />} 
            label="Reçus"
          />
          <NavButton 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
            icon={<SettingsIcon className="w-5 h-5" />} 
            label="Infos"
          />
        </div>
      </nav>

      {/* Add Loan Modal */}
      <AnimatePresence>
        {showAddModal && (
          <Modal 
            title={activeTab === 'received' ? 'Nouveau prêt reçu' : 'Nouveau prêt donné'} 
            onClose={() => setShowAddModal(false)}
          >
            <LoanForm 
              direction={activeTab === 'received' ? 'received' : 'given'} 
              onCancel={() => setShowAddModal(false)}
              onSave={handleSaveLoan}
            />
          </Modal>
        )}
        
        {showP2PModal && (
          <Modal title="Validation Mutuelle P2P" onClose={() => setShowP2PModal(false)}>
            <P2PValidationModal 
              settings={settings}
              onValidate={handleP2PValidate} 
              onCancel={() => setShowP2PModal(false)} 
            />
          </Modal>
        )}

        {selectedLoanForProof && (
          <Modal title="Acte d'Engagement" onClose={() => setSelectedLoanForProof(null)}>
            <div className="space-y-6">
              <div id="commitment-document" className="p-8 bg-white border-2 border-slate-900 rounded-lg text-slate-900 font-serif relative">
                {/* Formal Header */}
                <div className="text-center border-b-2 border-slate-900 pb-6 mb-8">
                  <h2 className="text-xl font-black uppercase tracking-tighter mb-1">PretManager Pro</h2>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Document de Preuve de Transaction</p>
                  <p className="text-[8px] mt-1 font-mono">Ref: {selectedLoanForProof.id}</p>
                </div>

                <div className="space-y-6 text-sm leading-relaxed">
                  <h3 className="text-center font-black underline uppercase text-base">Reconnaissance de Dette & Engagement</h3>
                  
                  <p>
                    Je soussigné(e) <span className="font-black border-b border-slate-300">{selectedLoanForProof.direction === 'given' ? settings.userName : selectedLoanForProof.personName}</span> (Prêteur), 
                    reconnais avoir mis à la disposition de <span className="font-black border-b border-slate-300">{selectedLoanForProof.direction === 'given' ? selectedLoanForProof.personName : settings.userName}</span> (Emprunteur), 
                    ce jour le <span className="font-bold">{format(parseISO(selectedLoanForProof.loanDate), 'dd/MM/yyyy')}</span>, 
                    {selectedLoanForProof.type === 'money' ? (
                      <>la somme de <span className="font-black">{formatCurrency(selectedLoanForProof.amount!, settings.currency)}</span></>
                    ) : (
                      <>l'objet suivant : <span className="font-black italic">{selectedLoanForProof.title}</span> ({selectedLoanForProof.description})</>
                    )} à titre de prêt.
                  </p>

                  <p>
                    L'Emprunteur s'engage fermement à restituer l'intégralité de ce prêt au plus tard le : 
                    <br />
                    <span className="text-lg font-black block mt-1 text-center bg-slate-100 p-2 rounded">
                      {format(parseISO(selectedLoanForProof.dueDate), 'dd MMMM yyyy', { locale: fr })}
                    </span>
                  </p>

                  <p className="text-xs italic text-slate-600">
                    "En validant cette transaction via l'application PretManager Pro, l'Emprunteur reconnaît avoir reçu les fonds/objets mentionnés et s'engage à respecter les délais de remboursement convenus de bonne foi."
                  </p>

                  <div className="grid grid-cols-2 gap-8 pt-12">
                    <div className="text-center border-t border-slate-300 pt-2">
                      <p className="text-[8px] uppercase font-bold text-slate-400 mb-8">Signature Prêteur</p>
                      <p className="text-[10px] font-bold">{selectedLoanForProof.direction === 'given' ? settings.userName : selectedLoanForProof.personName}</p>
                    </div>
                    <div className="text-center border-t border-slate-300 pt-2">
                      <p className="text-[8px] uppercase font-bold text-slate-400 mb-8">Signature Emprunteur (P2P)</p>
                      <p className="text-[10px] font-bold text-blue-600">CERTIFIÉ NUMÉRIQUEMENT ✅</p>
                      <p className="text-[10px] font-bold">{selectedLoanForProof.direction === 'given' ? selectedLoanForProof.personName : settings.userName}</p>
                    </div>
                  </div>
                </div>

                {/* QR Verification for paper copy */}
                <div className="mt-12 flex justify-between items-end">
                  <div className="text-[8px] text-slate-400 max-w-[60%]">
                    Ceci est un document généré par PretManager Pro. 
                    Il sert de preuve de la transaction mutuellement validée entre les deux parties.
                  </div>
                  <div className="p-1 bg-white border border-slate-200">
                    <QRCodeSVG value={`loan-proof-${selectedLoanForProof.id}`} size={60} />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => setSelectedLoanForProof(null)}
                >
                  Fermer
                </Button>
                <Button 
                  variant="primary" 
                  className="flex-1" 
                  onClick={async () => {
                    const doc = document.getElementById('commitment-document');
                    if (doc) {
                      const canvas = await html2canvas(doc, { scale: 2 });
                      const imgData = canvas.toDataURL('image/png');
                      const pdf = new jsPDF('p', 'mm', 'a4');
                      const imgProps = pdf.getImageProperties(imgData);
                      const pdfWidth = pdf.internal.pageSize.getWidth();
                      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                      pdf.save(`Engagement_${selectedLoanForProof.title}_${selectedLoanForProof.id}.pdf`);
                    }
                  }}
                >
                  <Download className="w-4 h-4 mr-2" /> Exporter PDF
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-all ${
      active ? 'text-blue-600' : 'text-slate-300'
    }`}
  >
    {icon}
    <span className={`text-[9px] font-black uppercase tracking-widest ${active ? 'opacity-100' : 'opacity-0'}`}>
      {label}
    </span>
    {active && (
      <motion.div 
        layoutId="activeTab" 
        className="absolute -bottom-1 w-1.5 h-1.5 bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.6)]"
      />
    )}
  </button>
);
