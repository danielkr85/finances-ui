import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountService } from '../../services/account.service';
import { AccountRequest, AccountType } from '../../models/account.model';

@Component({
  selector: 'app-account-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './account-form.component.html',
  styleUrls: ['./account-form.component.css']
})
export class AccountFormComponent implements OnInit {
  accountForm: FormGroup;
  isEditing = false;
  loading = false;
  error: string | null = null;
  accountId: number | null = null;

  accountTypes: { value: AccountType; label: string }[] = [
    { value: 'SAVINGS', label: 'Savings' },
    { value: 'CHECKING', label: 'Checking' },
    { value: 'CREDIT_CARD', label: 'Credit Card' }
  ];

  constructor(
    private fb: FormBuilder,
    private accountService: AccountService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.accountForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      amount: ['', [Validators.required, Validators.min(0)]],
      type: ['SAVINGS', [Validators.required]],
      main: [false]
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEditing = true;
      this.accountId = +id;
      this.loadAccountForEdit();
    }
  }

  loadAccountForEdit(): void {
    if (this.accountId === null) return;

    this.loading = true;
    this.error = null;

    this.accountService.getAccountById(this.accountId).subscribe({
      next: (account) => {
        this.accountForm.patchValue({
          name: account.name,
          amount: account.amount,
          type: account.type,
          main: account.main
        });
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load account';
        this.loading = false;
        console.error('Error loading account:', error);
      }
    });
  }

  onSubmit(): void {
    if (this.accountForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    const accountData: AccountRequest = this.accountForm.value;

    if (this.isEditing && this.accountId !== null) {
      this.accountService.updateAccount(this.accountId, accountData).subscribe({
        next: () => {
          this.router.navigate(['/accounts']);
        },
        error: (error) => {
          this.error = 'Failed to update account';
          this.loading = false;
          console.error('Error updating account:', error);
        }
      });
    } else {
      this.accountService.createAccount(accountData).subscribe({
        next: () => {
          this.router.navigate(['/accounts']);
        },
        error: (error) => {
          this.error = 'Failed to create account';
          this.loading = false;
          console.error('Error creating account:', error);
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/accounts']);
  }
}
