// components/pharmacy/bottle-showcase.tsx

export type BadgeTone = 'amber' | 'emerald' | 'rose';

export interface BottleItem {
    src: string;
    label: string;
    count: number;
    tone: BadgeTone;
}

const BADGE_TONE: Record<BadgeTone, string> = {
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-600',
    rose: 'bg-rose-600',
};

interface BottleShowcaseProps {
    bottles: BottleItem[];
    className?: string;
}

/**
 * Product bottles with a count badge, for the right side of a page header.
 * - no borders or frames: bottles sit directly on the header
 * - `mix-blend-multiply` drops the white photo background onto a white card
 * - the badge carries the number, the caption underneath names it
 */
export default function BottleShowcase({
    bottles,
    className = '',
}: BottleShowcaseProps) {
    return (
        <ul
            aria-label="Pharmacy summary"
            className={`hidden items-start gap-5 select-none md:flex lg:gap-7 ${className}`}
        >
            {bottles.map((bottle) => (
                <li
                    key={bottle.label}
                    className="flex flex-col items-center"
                    title={`${bottle.label}: ${bottle.count}`}
                >
                    <div className="relative">
                        <img
                            src={bottle.src}
                            alt=""
                            draggable={false}
                            loading="lazy"
                            className="pointer-events-none h-16 w-auto object-contain mix-blend-multiply lg:h-[4.5rem]"
                        />
                        <span
                            className={`absolute -top-1.5 -right-3 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold text-white tabular-nums ring-2 ring-white dark:ring-slate-800 ${BADGE_TONE[bottle.tone]}`}
                        >
                            {bottle.count.toLocaleString()}
                        </span>
                        {/* soft ground shadow */}
                        <span className="absolute inset-x-1 -bottom-1 h-2 rounded-full bg-slate-900/10 blur-md" />
                    </div>
                    <span className="mt-2.5 text-[11px] leading-none font-medium whitespace-nowrap text-slate-500">
                        {bottle.label}
                    </span>
                    <span className="sr-only">{bottle.count}</span>
                </li>
            ))}
        </ul>
    );
}
