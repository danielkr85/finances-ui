import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { PercentPipe } from '@angular/common';
import { ArcElement, Chart, ChartConfiguration, PieController, Tooltip } from 'chart.js';
import { ExpenseSlice, SliceColor } from '../../models/expense-categories';
import { ThemeService } from '../../services/theme.service';
import { MoneyPipe } from '../../shared/money.pipe';

// Register only what this chart uses, so the rest of Chart.js is tree-shaken away.
Chart.register(PieController, ArcElement, Tooltip);

const money = new MoneyPipe();
const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 });

/** Colours come from CSS custom properties (see the .css), so light and dark are chosen there, not here. */
interface ChartColors {
  slots: string[];
  other: string;
  uncategorized: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
}

/**
 * Monthly expenses by category as a pie, with a table beside it that names every slice and gives its figures (the
 * legend and the text equivalent in one).
 */
@Component({
  selector: 'app-expense-category-chart',
  imports: [MoneyPipe, PercentPipe],
  templateUrl: './expense-category-chart.component.html',
  styleUrls: ['./expense-category-chart.component.css'],
})
export class ExpenseCategoryChartComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly themes = inject(ThemeService);

  readonly slices = input.required<ExpenseSlice[]>();

  private readonly rendered = signal(false);
  private chart: Chart<'pie', number[], string> | null = null;
  private chartTheme: string | null = null;
  private colors: ChartColors | null = null;

  readonly total = computed(() => this.slices().reduce((sum, s) => sum + s.amount, 0));

  /** What a screen reader hears instead of the canvas; the table is the full text equivalent. */
  readonly summary = computed(() => {
    const parts = this.slices().map(
      (s) => `${s.name} ${money.transform(s.amount)} (${percent.format(s.share)})`,
    );
    return `Monthly expenses by category, ${money.transform(this.total())} in all: ${parts.join(', ')}.`;
  });

  constructor() {
    afterNextRender(() => this.rendered.set(true));
    effect(() => {
      const theme = this.themes.theme();
      const slices = this.slices();
      if (!this.rendered()) {
        return;
      }
      // Colours are read from CSS once, when the chart is built, so a theme switch rebuilds it.
      if (this.chart && theme !== this.chartTheme) {
        this.chart.destroy();
        this.chart = null;
      }
      this.chartTheme = theme;
      this.draw(slices);
    });
    inject(DestroyRef).onDestroy(() => this.chart?.destroy());
  }

  /** The swatch colour in the table, as a CSS variable so it follows the theme without a redraw. */
  swatch(color: SliceColor): string {
    return typeof color === 'number' ? `var(--chart-cat-${color + 1})` : `var(--chart-${color})`;
  }

  private draw(slices: ExpenseSlice[]): void {
    if (this.chart && this.colors) {
      // Update in place: the previous render stays on screen while new data arrives (no flash).
      this.applyData(this.chart, slices, this.colors);
      this.chart.update('none');
      return;
    }
    const canvas = this.canvas().nativeElement;
    if (!canvas.getContext?.('2d')) {
      return; // no canvas support (e.g. jsdom in unit tests)
    }
    this.colors = this.readColors();
    this.chart = new Chart(canvas, this.buildConfig(this.colors));
    this.applyData(this.chart, slices, this.colors);
    this.chart.update('none');
  }

  private applyData(chart: Chart<'pie', number[], string>, slices: ExpenseSlice[], c: ChartColors) {
    chart.data.labels = slices.map((s) => s.name);
    const dataset = chart.data.datasets[0];
    dataset.data = slices.map((s) => s.amount);
    dataset.backgroundColor = slices.map((s) =>
      typeof s.color === 'number' ? c.slots[s.color] : c[s.color],
    );
  }

  private readColors(): ChartColors {
    const style = getComputedStyle(this.host.nativeElement);
    const v = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
    return {
      slots: Array.from({ length: 8 }, (_, i) => v(`--chart-cat-${i + 1}`, '#2a78d6')),
      other: v('--chart-other', '#8f98a1'),
      uncategorized: v('--chart-uncategorized', '#ced4da'),
      surface: v('--chart-surface', '#ffffff'),
      text: v('--chart-text', '#212529'),
      muted: v('--chart-muted', '#6c757d'),
      border: v('--chart-border', '#dee2e6'),
    };
  }

  private buildConfig(c: ChartColors): ChartConfiguration<'pie', number[], string> {
    const font = { family: getComputedStyle(this.host.nativeElement).fontFamily, size: 12 };
    return {
      type: 'pie',
      data: {
        labels: [],
        datasets: [
          {
            data: [],
            // A surface-coloured gap between slices keeps neighbours apart, even in similar hues.
            borderColor: c.surface,
            borderWidth: 2,
            hoverBorderColor: c.surface,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        layout: { padding: 4 }, // room for the hovered slice to pop out
        plugins: {
          tooltip: {
            backgroundColor: c.surface,
            borderColor: c.border,
            borderWidth: 1,
            titleColor: c.text,
            bodyColor: c.muted,
            titleFont: { ...font, size: 14, weight: 'bold' },
            bodyFont: font,
            padding: 10,
            caretSize: 0,
            displayColors: false,
            callbacks: {
              // Value first: the reader picked the category by pointing at it.
              title: (items) => {
                const item = items[0];
                return item ? `${money.transform(item.raw as number)} / month` : '';
              },
              label: (item) => {
                const values = item.dataset.data;
                const total = values.reduce((sum, v) => sum + v, 0);
                const share = total ? (item.raw as number) / total : 0;
                return `${item.label} · ${percent.format(share)}`;
              },
            },
          },
        },
      },
    };
  }
}
