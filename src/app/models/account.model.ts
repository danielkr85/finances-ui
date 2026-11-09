export type AccountType = 'SAVINGS' | 'CHECKING' | 'CREDIT_CARD';

/** The caller's access to an account, lowest to highest. */
export type AccountRole = 'VIEWER' | 'EDITOR' | 'OWNER';

/** Roles that can be granted when sharing (the owner is fixed). */
export type ShareRole = Exclude<AccountRole, 'OWNER'>;

const ROLE_RANK: Record<AccountRole, number> = { VIEWER: 0, EDITOR: 1, OWNER: 2 };

/** Whether `role` is at least `required`, e.g. hasRole(account.myRole, 'EDITOR'). */
export function hasRole(role: AccountRole, required: AccountRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

/** Credit-card billing settings. Only allowed on CREDIT_CARD; the cycle budget needs all four. */
export interface CreditCardBilling {
  /** Day of month the bill is due, 1–31 (clamped in short months). */
  paymentDueDay?: number | null;
  /** The statement closes this many days before the due date, 1–28. */
  closingDaysBeforeDue?: number | null;
  /** Unpaid balance of the last closed statement, 0..amount. */
  statementBalance?: number | null;
  /** The bill you aim for each cycle, ≥ 0. */
  monthlyTarget?: number | null;
}

/** Whether the server can compute a cycle budget: a credit card with all four billing fields set. */
export function hasCycleBudget(account: AccountRequest): boolean {
  return (
    account.type === 'CREDIT_CARD' &&
    account.paymentDueDay != null &&
    account.closingDaysBeforeDue != null &&
    account.statementBalance != null &&
    account.monthlyTarget != null &&
    account.statementBalance <= account.amount
  );
}

export interface AccountRequest extends CreditCardBilling {
  /** Unique among the owner's accounts (case-insensitive). */
  name: string;
  /** Balance as of today in whole dollars; may be 0 or negative. For a credit card: the total owed. */
  amount: number;
  type: AccountType;
  main: boolean;
}

export interface Account extends AccountRequest {
  id: number;
  ownerId: number;
  ownerEmail: string;
  myRole: AccountRole;
  createdAt: string;
  updatedAt: string;
}

/** A user with access to an account; the owner is listed first with role OWNER. */
export interface AccountMember {
  userId: number;
  email: string;
  displayName: string;
  role: AccountRole;
}

export interface AccountShareRequest {
  email: string;
  role: ShareRole;
}

export interface AccountShareUpdateRequest {
  role: ShareRole;
}
