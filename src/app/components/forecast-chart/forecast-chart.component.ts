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
import {
  Chart,
  ChartConfiguration,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  Plugin,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Forecast, forecastExtreme, signedAmount } from '../../models/forecast.model';
import { MoneyPipe } from '../../shared/money.pipe';
import { axisMoney, DailyBalance, dailyBalances } from './forecast-series';

// Register only what this chart uses, so the rest of Chart.js is tree-shaken away.
Chart.register(LineController, LineElement, PointElement, LinearScale, Filler, Tooltip);

const money = new MoneyPipe();
const DAY_LABEL = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const LONG_DAY = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

/** yyyy-MM-dd → local Date at noon (no timezone drift when formatting). */
const toDate = (iso: string) => new Date(`${iso}T12:00:00`);

/** Colours come from CSS custom properties (see the .css), so light and dark are chosen there, not here. */
interface ChartColors {
  series: string;
  seriesWash: string;
  surface: string;
  grid: string;
  baseline: string;
  text: string;
  muted: string;
  border: string;
}

/**
 * The forecast as a stepped line: the balance holds between events and jumps on event dates. One series, so no
 * legend; the summary cards and the table below carry every value without hovering.
 */
@Component({
  selector: 'app-forecast-chart',
  templateUrl: './forecast-chart.component.html',
  styleUrls: ['./forecast-chart.component.css'],
})
export class ForecastChartComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  readonly forecast = input.required<Forecast>();
  readonly isCreditCard = input(false);
  readonly accountName = input('');
  readonly compact = input(false);

  private readonly rendered = signal(false);
  private chart: Chart<'line', DailyBalance[]> | null = null;

  readonly points = computed(() => dailyBalances(this.forecast()));
  readonly extreme = computed(() => forecastExtreme(this.forecast(), this.isCreditCard()));

  /** What a screen reader hears instead of the canvas; the table below is the full text equivalent. */
  readonly summary = computed(() => {
    const f = this.forecast();
    const e = this.extreme();
    const what = this.isCreditCard() ? 'Amount owed' : 'Balance';
    const range = `${DAY_LABEL.format(toDate(f.from))} to ${DAY_LABEL.format(toDate(f.to))}`;
    const peak = this.isCreditCard() ? 'most owed' : 'lowest';
    return (
      `${what} forecast for ${this.accountName() || 'this account'}, ${range}: ` +
      `starts at ${money.transform(f.openingBalance)}, ends at ${money.transform(f.finalBalance)}, ` +
      `${peak} ${money.transform(e.balance)} on ${DAY_LABEL.format(toDate(e.date))}.`
    );
  });

  constructor() {
    afterNextRender(() => this.rendered.set(true));
    effect(() => {
      if (this.rendered()) {
        this.draw(this.points(), this.extreme().date, this.isCreditCard());
      }
    });
    inject(DestroyRef).onDestroy(() => this.chart?.destroy());
  }

  private draw(points: DailyBalance[], extremeDate: string, creditCard: boolean): void {
    const extremeIndex = Math.max(
      0,
      points.findIndex((p) => p.date === extremeDate),
    );

    if (this.chart) {
      // Update in place: the previous render stays on screen while new data arrives (no flash).
      this.chart.data.datasets[0].data = points;
      this.chart.$extremeIndex = extremeIndex;
      this.chart.$creditCard = creditCard;
      this.chart.update('none');
      return;
    }

    const canvas = this.canvas().nativeElement;
    if (!canvas.getContext?.('2d')) {
      return; // no canvas support (e.g. jsdom in unit tests)
    }
    const config = this.buildConfig(points, this.readColors());
    this.chart = new Chart(canvas, config);
    this.chart.$extremeIndex = extremeIndex;
    this.chart.$creditCard = creditCard;
    this.chart.update('none');
  }

  private readColors(): ChartColors {
    const style = getComputedStyle(this.host.nativeElement);
    const v = (name: string) => style.getPropertyValue(name).trim();
    const series = v('--chart-series') || '#2a78d6';
    return {
      series,
      seriesWash: withAlpha(series, 0.1),
      surface: v('--chart-surface') || '#ffffff',
      grid: v('--chart-grid') || '#dee2e6',
      baseline: v('--chart-baseline') || '#adb5bd',
      text: v('--chart-text') || '#212529',
      muted: v('--chart-muted') || '#6c757d',
      border: v('--chart-border') || '#dee2e6',
    };
  }

  private buildConfig(
    points: DailyBalance[],
    c: ChartColors,
  ): ChartConfiguration<'line', DailyBalance[]> {
    const font = { family: getComputedStyle(this.host.nativeElement).fontFamily, size: 12 };
    let axisMaxAbs = 0;

    return {
      type: 'line',
      data: {
        datasets: [
          {
            data: points,
            parsing: false,
            stepped: 'after', // the balance holds until the next event date
            borderColor: c.series,
            borderWidth: 2,
            borderJoinStyle: 'round',
            borderCapStyle: 'round',
            backgroundColor: c.seriesWash,
            fill: 'origin',
            // Only the low point (or a card's peak) gets a resting dot; every other dot appears on hover.
            pointRadius: (ctx) => (ctx.dataIndex === ctx.chart.$extremeIndex ? 4 : 0),
            pointHoverRadius: 5,
            pointBackgroundColor: c.series,
            pointBorderColor: c.surface,
            pointBorderWidth: 2,
            pointHoverBorderWidth: 2,
            pointHitRadius: 12,
            clip: 6, // let a dot on the first or last day show in full
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        normalized: true,
        layout: { padding: { top: 16, right: 8 } }, // headroom for a label above a peak
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        scales: {
          x: {
            type: 'linear',
            min: 0,
            max: points.length - 1,
            border: { color: c.baseline },
            grid: { display: false },
            ticks: {
              color: c.muted,
              font,
              precision: 0,
              maxRotation: 0,
              autoSkipPadding: 24,
              maxTicksLimit: this.compact() ? 5 : 8,
              callback: (value) => {
                const point = points[Number(value)];
                return point ? DAY_LABEL.format(toDate(point.date)) : '';
              },
            },
          },
          y: {
            border: { display: false },
            grid: {
              // Hairline gridlines; $0 gets the stronger baseline colour so going negative stands out.
              color: (ctx) => (ctx.tick?.value === 0 ? c.baseline : c.grid),
              lineWidth: 1,
            },
            ticks: {
              color: c.muted,
              font,
              maxTicksLimit: 6, // fewer makes Chart.js jump to coarse $5K steps
              callback: (value, _index, ticks) => {
                if (_index === 0) {
                  axisMaxAbs = Math.max(...ticks.map((t) => Math.abs(t.value)));
                }
                return axisMoney(Number(value), axisMaxAbs);
              },
            },
          },
        },
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
            displayColors: false,
            caretSize: 0,
            callbacks: {
              // Value first: the reader picked the date by pointing at it.
              title: (items) => {
                const p = items[0]?.raw as DailyBalance | undefined;
                if (!p) {
                  return '';
                }
                const owed = items[0].chart.$creditCard ? ' owed' : '';
                return `${money.transform(p.y)}${owed}`;
              },
              label: (item) => {
                const p = item.raw as DailyBalance;
                return [
                  LONG_DAY.format(toDate(p.date)),
                  ...p.events.map(
                    (e) => `${money.transform(signedAmount(e), true)}  ${e.description}`,
                  ),
                ];
              },
            },
          },
        },
      },
      plugins: [crosshair(c.baseline), extremeLabel(c.muted, c.surface, font)],
    };
  }
}

/** A vertical hairline at the hovered date. */
function crosshair(color: string): Plugin<'line'> {
  return {
    id: 'crosshair',
    afterDatasetsDraw(chart) {
      const active = chart.getActiveElements()[0];
      if (!active) {
        return;
      }
      const { ctx, chartArea } = chart;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(active.element.x) + 0.5, chartArea.top);
      ctx.lineTo(Math.round(active.element.x) + 0.5, chartArea.bottom);
      ctx.stroke();
      ctx.restore();
    },
  };
}

/** Names the one marked point ("Lowest $820" / "Most owed $1,300"), kept inside the plot. */
function extremeLabel(
  color: string,
  halo: string,
  font: { family: string; size: number },
): Plugin<'line'> {
  return {
    id: 'extremeLabel',
    afterDatasetsDraw(chart) {
      const index = chart.$extremeIndex;
      if (index === undefined) {
        return;
      }
      const point = chart.getDatasetMeta(0).data[index];
      const raw = chart.data.datasets[0].data[index] as unknown as DailyBalance | undefined;
      if (!point || !raw) {
        return;
      }
      const text = `${chart.$creditCard ? 'Most owed' : 'Lowest'} ${money.transform(raw.y)}`;
      const { ctx, chartArea } = chart;
      ctx.save();
      ctx.font = `${font.size}px ${font.family}`;
      const width = ctx.measureText(text).width;
      const x = Math.min(Math.max(point.x - width / 2, chartArea.left), chartArea.right - width);

      // Nothing is below a minimum or above a maximum, so that side is free: below the low point, above a
      // card's peak. Flip only when the plot edge leaves no room.
      const gap = 10;
      const below = point.y + gap + font.size;
      const above = point.y - gap;
      const roomBelow = below <= chartArea.bottom - 2;
      const roomAbove = above - font.size >= 2; // the top padding is free space too
      const preferBelow = !chart.$creditCard;
      const y = preferBelow ? (roomBelow ? below : above) : roomAbove ? above : below;

      // A surface-coloured outline keeps the text legible if a line still passes behind it.
      ctx.lineJoin = 'round';
      ctx.lineWidth = 4;
      ctx.strokeStyle = halo;
      ctx.strokeText(text, x, y);
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
      ctx.restore();
    },
  };
}

/** #rrggbb → rgba() with the given alpha (Chart.js needs a concrete colour for the area wash). */
function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) {
    return hex;
  }
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Per-chart state the plugins and scriptable options read.
declare module 'chart.js' {
  interface Chart {
    $extremeIndex?: number;
    $creditCard?: boolean;
  }
}
