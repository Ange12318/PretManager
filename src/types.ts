/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CurrencyCode = 'XOF' | 'EUR' | 'USD' | 'GBP' | 'XAF' | 'GNF';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  label: string;
}

export type LoanType = 'money' | 'object';
export type LoanDirection = 'given' | 'received';
export type P2PStatus = 'none' | 'pending' | 'confirmed' | 'rejected';

export interface Loan {
  id: string;
  title: string;
  type: LoanType;
  direction: LoanDirection;
  amount?: number;
  description?: string;
  personName: string;
  personContact?: string;
  loanDate: string;
  dueDate: string;
  returnDate?: string;
  photoUri?: string;
  isP2P: boolean;
  p2pTransactionId?: string;
  p2pStatus: P2PStatus;
  status: 'active' | 'returned';
  createdAt: string;
}

export interface P2PTransaction {
  id: string;
  senderUserId: string;
  receiverUserId: string;
  loanId: string;
  status: P2PStatus;
  timestampRequest: string;
  timestampConfirm?: string;
}

export interface UserSettings {
  currency: CurrencyCode;
  defaultReminders: number; // days before
  theme: 'light' | 'dark' | 'system';
  userId: string; // Internal ID for P2P identification
  userName: string;
  onboarded: boolean;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  XOF: { code: 'XOF', symbol: 'CFA', label: 'Franc CFA (BCEAO)' },
  EUR: { code: 'EUR', symbol: '€', label: 'Euro' },
  USD: { code: 'USD', symbol: '$', label: 'US Dollar' },
  GBP: { code: 'GBP', symbol: '£', label: 'Pound Sterling' },
  XAF: { code: 'XAF', symbol: 'FCFA', label: 'Franc CFA (BEAC)' },
  GNF: { code: 'GNF', symbol: 'FG', label: 'Franc Guinéen' },
};
