import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { IncomeService } from '../../services/income.service';
import { Income } from '../../models/income.model';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe, TitleCasePipe } from '@angular/common';

@Component({
    selector: 'app-income-list',
    templateUrl: './income-list.component.html',
    styleUrls: ['./income-list.component.css'],
    imports: [DecimalPipe, RouterLink, TitleCasePipe]
})
export class IncomeListComponent implements OnInit {
    incomes: Income[] = [];
    loading = false;
    error: string | null = null;
    targetDeleteId: number | string | null = null;

    constructor(
        private incomeService: IncomeService,
        private router: Router,
        public cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.loadIncomes();
    }

    loadIncomes(): void {
        this.loading = true;
        this.error = null;

        this.incomeService.getAllIncomes().subscribe({
            next: (incomes) => {
                this.incomes = incomes;
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: (error) => {
                this.error = 'Failed to load incomes';
                this.loading = false;
                this.cdr.detectChanges();
                console.error('Error loading incomes:', error);
            }
        });
    }

    addIncome(): void {
        this.router.navigate(['/incomes', 'new']);
    }

    setTargetDeleteId(id: number | string): void {
        this.targetDeleteId = id;
    }

    confirmDelete(): void {
        if (this.targetDeleteId) {
            this.incomeService.deleteIncome(this.targetDeleteId).subscribe({
                next: () => {
                    this.loadIncomes();
                    this.targetDeleteId = null;
                },
                error: (error) => {
                    this.error = 'Failed to delete income';
                    console.error('Error deleting income:', error);
                }
            });
        }
    }
}
