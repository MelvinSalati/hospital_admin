# HMIS Dashboard — Refactored Architecture

## File Map

```
resources/js/
├── pages/
│   └── Dashboard.tsx                   ← Inertia page (drop-in replacement)
│
├── components/dashboard/
│   ├── cards/
│   │   └── StatCard.tsx                ← Summary metric card w/ trend indicator
│   ├── charts/
│   │   ├── PaymentMethodsChart.tsx     ← Vertical bar chart (Recharts)
│   │   └── AgeDistributionChart.tsx    ← Horizontal bar chart (pure CSS)
│   ├── tables/
│   │   └── InvoiceTable.tsx            ← Filterable table + pagination
│   └── modals/
│       └── InvoiceDetailsModal.tsx     ← Scrollable invoice detail overlay
│
└── types/dashboard.ts                  ← All TypeScript interfaces

app/Http/Controllers/
└── DashboardController.php             ← Props builder (real DB queries)
```

## Layout

```
┌─────────────────────────────────────────────────┐
│  Total Patients │ Today's Visits │ Revenue │ Bills│  ← StatCard × 4
├─────────────────────────┬───────────────────────┤
│  Payment Methods        │  Age Distribution     │  ← Analytics row
│  (vertical bar chart)   │  (horizontal bars)    │
├─────────────────────────┴───────────────────────┤
│  Invoice Management Table                        │
│  [All] [Paid] [Unpaid] [Partial]   ← filter tabs│
│  Invoice# │ Patient │ Date │ Total │ Paid │ ...  │
│  ← Prev   1  2  3  …  12   Next →              │
└─────────────────────────────────────────────────┘
```

## Props contract (Inertia)

```ts
interface DashboardProps {
    statistics: {
        totalPatients: number;
        todayVisits: number;
        revenueToday: number;
        pendingBills: number;
        todayVisitsTrend?: { direction: 'up'|'down'|'neutral'; percentage: number; label?: string };
        revenueTodayTrend?: { direction: 'up'|'down'|'neutral'; percentage: number; label?: string };
    };
    paymentMethods: Array<{ method: string; amount: number }>;
    ageDistribution: Array<{ label: string; count: number }>;
    invoices: {
        data: Invoice[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number;
        to: number;
        links: PaginationLink[];
    };
}
```

## Design decisions

- **Palette**: slate scale for backgrounds/borders, semantic accents only for status badges (emerald=paid, red=unpaid, amber=partial). No decorative gradients.
- **Typography**: system-ui / Inter — readable at small sizes, clinical density without being cramped.
- **Charts**: Recharts for PaymentMethods (consistent with existing codebase), pure CSS bars for AgeDistribution (faster, no JS overhead for 4 static bands).
- **No hardcoded data**: every value flows from Laravel props. `DashboardController.php` runs real aggregate queries.
- **Pagination**: client-side filter (instant), server-side pagination via `router.get` with `preserveState`.
- **Dark mode**: all components use Tailwind `dark:` variants with `slate-800/900` surfaces.
- **Accessibility**: `aria-label` on sections, `role="dialog"` + `aria-modal` on modal, keyboard `Escape` to close.

## Dependencies required

```bash
# Already in a standard Laravel/Inertia/React stack:
npm install recharts lucide-react
```

No additional packages needed.
