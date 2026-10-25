export type AccountType = 'SAVINGS' | 'CHECKING' | 'CREDIT_CARD';

export interface Account {
  id?: number;
  name: string;
  amount: number;
  type: AccountType;
  main: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface AccountRequest {
  name: string;
  amount: number;
  type: AccountType;
  main: boolean;
}

export interface AccountResponse {
  id: number;
  name: string;
  amount: number;
  type: AccountType;
  main: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}
