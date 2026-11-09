import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { apiErrorMessage } from '../../models/api-error.model';
import { Category } from '../../models/category.model';
import { CategoryService } from '../../services/category.service';
import { applyServerErrors, serverError } from '../../shared/form-errors';

const byName = (a: Category, b: Category) => a.name.localeCompare(b.name);

/** Your private categories: add, rename inline, delete (blocked while planned transactions use one). */
@Component({
  selector: 'app-category-list',
  imports: [ReactiveFormsModule],
  templateUrl: './category-list.component.html'
})
export class CategoryListComponent implements OnInit {
  private readonly categoryService = inject(CategoryService);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly serverError = serverError;
  readonly categories = signal<Category[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly editingId = signal<number | null>(null);

  readonly addForm = this.fb.group({ name: ['', [Validators.required, Validators.maxLength(255)]] });
  readonly editForm = this.fb.group({ name: ['', [Validators.required, Validators.maxLength(255)]] });

  ngOnInit(): void {
    this.categoryService.getCategories().subscribe({
      next: categories => {
        this.categories.set(categories);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(apiErrorMessage(err, 'Failed to load categories.'));
        this.loading.set(false);
      }
    });
  }

  add(): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.categoryService.createCategory({ name: this.addForm.getRawValue().name.trim() }).subscribe({
      next: created => {
        this.categories.update(list => [...list, created].sort(byName));
        this.addForm.reset();
        this.busy.set(false);
      },
      error: err => {
        this.error.set(applyServerErrors(this.addForm, err, 'Failed to add the category.'));
        this.busy.set(false);
      }
    });
  }

  startEdit(category: Category): void {
    this.editingId.set(category.id);
    this.editForm.reset({ name: category.name });
    this.error.set(null);
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  saveEdit(category: Category): void {
    const name = this.editForm.getRawValue().name.trim();
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    if (name === category.name) {
      this.editingId.set(null);
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.categoryService.updateCategory(category.id, { name }).subscribe({
      next: updated => {
        this.categories.update(list => list.map(c => (c.id === updated.id ? updated : c)).sort(byName));
        this.editingId.set(null);
        this.busy.set(false);
      },
      error: err => {
        this.error.set(applyServerErrors(this.editForm, err, 'Failed to rename the category.'));
        this.busy.set(false);
      }
    });
  }

  remove(category: Category): void {
    if (!confirm(`Delete the category "${category.name}"?`)) {
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.categoryService.deleteCategory(category.id).subscribe({
      next: () => {
        this.categories.update(list => list.filter(c => c.id !== category.id));
        this.busy.set(false);
      },
      error: err => {
        this.error.set(err instanceof HttpErrorResponse && err.status === 409
          ? `"${category.name}" is used by planned transactions. Change or delete those first.`
          : apiErrorMessage(err, 'Failed to delete the category.'));
        this.busy.set(false);
      }
    });
  }
}
