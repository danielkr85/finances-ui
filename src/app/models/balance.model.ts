export interface Balance {
  id?: number;
  name: string;
  amount: number;
  type: 'SAVINGS' | 'CHECKING' | 'CREDIT_CARD';
  main: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BalanceRequest {
  name: string;
  amount: number;
  type: 'SAVINGS' | 'CHECKING' | 'CREDIT_CARD';
  main: boolean;
}

export interface BalanceResponse {
  id: number;
  name: string;
  amount: number;
  type: 'SAVINGS' | 'CHECKING' | 'CREDIT_CARD';
  main: boolean;
  createdAt: Date;
  updatedAt: Date;
}