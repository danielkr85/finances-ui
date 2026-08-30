import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BalanceService } from '../../services/balance.service';
import { BalanceRequest } from '../../models/balance.model';

@Component({
  selector: 'app-balance-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './balance-form.component.html',
  styleUrls: ['./balance-form.component.css']
})
export class BalanceFormComponent implements OnInit {
  balanceForm: FormGroup;
  isEditing = false;
  loading = false;
  error: string | null = null;
  balanceId: number | null = null;

  balanceTypes = [
    { value: 'SAVINGS', label: 'Savings' },
    { value: 'CHECKING', label: 'Checking' },
    { value: 'CREDIT_CARD', label: 'Credit Card' }
  ];

  constructor(
    private fb: FormBuilder,
    private balanceService: BalanceService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.balanceForm = this.fb.group({
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
      this.balanceId = +id;
      this.loadBalanceForEdit();
    }
  }

  loadBalanceForEdit(): void {
    if (this.balanceId === null) return;

    this.loading = true;
    this.error = null;

    this.balanceService.getBalanceById(this.balanceId).subscribe({
      next: (balance) => {
        this.balanceForm.patchValue({
          name: balance.name,
          amount: balance.amount,
          type: balance.type,
          main: balance.main
        });
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load balance';
        this.loading = false;
        console.error('Error loading balance:', error);
      }
    });
  }

  onSubmit(): void {
    if (this.balanceForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    const balanceData: BalanceRequest = this.balanceForm.value;

    if (this.isEditing && this.balanceId !== null) {
      this.balanceService.updateBalance(this.balanceId, balanceData).subscribe({
        next: () => {
          this.router.navigate(['/balances']);
        },
        error: (error) => {
          this.error = 'Failed to update balance';
          this.loading = false;
          console.error('Error updating balance:', error);
        }
      });
    } else {
      this.balanceService.createBalance(balanceData).subscribe({
        next: () => {
          this.router.navigate(['/balances']);
        },
        error: (error) => {
          this.error = 'Failed to create balance';
          this.loading = false;
          console.error('Error creating balance:', error);
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/balances']);
  }
}