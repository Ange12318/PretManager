/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Loan, UserSettings, P2PTransaction, CurrencyCode } from '../types';

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  onSnapshot 
} from 'firebase/firestore';
import { db, auth } from './firebase';

const LOANS_KEY = 'pretmanager_loans';
const SETTINGS_KEY = 'pretmanager_settings';
const P2P_TX_KEY = 'pretmanager_p2p_transactions';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const storage = {
  // --- Local Fallback / Cache ---
  getLocalLoans: (): Loan[] => {
    const data = localStorage.getItem(LOANS_KEY);
    return data ? JSON.parse(data) : [];
  },
  saveLocalLoans: (loans: Loan[]) => {
    localStorage.setItem(LOANS_KEY, JSON.stringify(loans));
  },

  // --- Firestore Actions ---

  syncLoans: (callback: (loans: Loan[]) => void) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    
    const path = `users/${uid}/loans`;
    const q = collection(db, path);
    return onSnapshot(q, (snapshot) => {
      const loans = snapshot.docs.map(doc => doc.data() as Loan);
      storage.saveLocalLoans(loans);
      callback(loans);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  getLoans: async (): Promise<Loan[]> => {
    const uid = auth.currentUser?.uid;
    if (!uid) return storage.getLocalLoans();
    
    const path = `users/${uid}/loans`;
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(doc => doc.data() as Loan);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  addLoan: async (loan: Loan) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      const loans = storage.getLocalLoans();
      storage.saveLocalLoans([...loans, loan]);
      return;
    }

    const path = `users/${uid}/loans/${loan.id}`;
    try {
      await setDoc(doc(db, `users/${uid}/loans`, loan.id), loan);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  updateLoan: async (updatedLoan: Loan) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      const loans = storage.getLocalLoans();
      storage.saveLocalLoans(loans.map(l => l.id === updatedLoan.id ? updatedLoan : l));
      return;
    }

    const path = `users/${uid}/loans/${updatedLoan.id}`;
    try {
      await setDoc(doc(db, `users/${uid}/loans`, updatedLoan.id), updatedLoan);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  deleteLoan: async (id: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      const loans = storage.getLocalLoans();
      storage.saveLocalLoans(loans.filter(l => l.id !== id));
      return;
    }

    const path = `users/${uid}/loans/${id}`;
    try {
      await deleteDoc(doc(db, `users/${uid}/loans`, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Settings
  getSettings: async (): Promise<UserSettings> => {
    const uid = auth.currentUser?.uid;
    const localData = localStorage.getItem(SETTINGS_KEY);
    const localSettings = localData ? JSON.parse(localData) : null;

    if (!uid) {
      if (localSettings) return localSettings;
      const defaultSettings: UserSettings = {
        currency: 'XOF',
        defaultReminders: 1,
        theme: 'system',
        userId: `PM-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        userName: 'Utilisateur',
        onboarded: false,
      };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
      return defaultSettings;
    }

    const path = `users/${uid}`;
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const settings = userDoc.data() as UserSettings;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        return settings;
      } else if (localSettings) {
        await setDoc(doc(db, 'users', uid), localSettings);
        return localSettings;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }

    const defaultSettings: UserSettings = {
      currency: 'XOF',
      defaultReminders: 1,
      theme: 'system',
      userId: `PM-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      userName: 'Utilisateur',
      onboarded: false,
    };
    return defaultSettings;
  },

  saveSettings: async (settings: UserSettings) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const path = `users/${uid}`;
    try {
      await setDoc(doc(db, 'users', uid), settings);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // P2P Transactions
  getP2PTransactions: (): P2PTransaction[] => {
    const data = localStorage.getItem(P2P_TX_KEY);
    return data ? JSON.parse(data) : [];
  },
  saveP2PTransactions: (txs: P2PTransaction[]) => {
    localStorage.setItem(P2P_TX_KEY, JSON.stringify(txs));
  },

  // Database actions
  exportData: async () => {
    const data = {
      loans: await storage.getLoans(),
      settings: await storage.getSettings(),
      p2pTransactions: storage.getP2PTransactions(),
    };
    return JSON.stringify(data, null, 2);
  }
};

export const formatCurrency = (amount: number, currency: CurrencyCode): string => {
  const config = {
    XOF: { locale: 'fr-FR', currency: 'XOF' },
    XAF: { locale: 'fr-FR', currency: 'XAF' },
    GNF: { locale: 'fr-GN', currency: 'GNF' },
    EUR: { locale: 'de-DE', currency: 'EUR' },
    USD: { locale: 'en-US', currency: 'USD' },
    GBP: { locale: 'en-GB', currency: 'GBP' },
  };

  const { locale } = config[currency];
  
  // Custom formatter for CFA and others that might not be perfectly supported by all native Intl
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      currencyDisplay: 'symbol',
    }).format(amount);
  } catch (e) {
    return `${amount.toLocaleString()} ${currency}`;
  }
};
