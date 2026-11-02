import clsx, { type ClassValue } from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export const cn = (...v: ClassValue[]) => clsx(v);

export function Card({ className, children, ...rest }: ComponentProps<"section">) {
  return (
    <section className={cn("rounded-xl border border-line bg-surface", className)} {...rest}>
      {children}
    </section>
  );
}

export function CardHeader({ title, eyebrow, action, id }: { title: ReactNode; eyebrow?: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-0.5">{eyebrow}</div>}
        <h2 id={id} className="font-display text-base font-semibold tracking-tight text-ink">
          {title}
        </h2>
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, children, actions }: { eyebrow?: ReactNode; title: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-[2rem] sm:leading-tight">{title}</h1>
        {children && <div className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-2">{children}</div>}
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

const buttonBase =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap";
const buttonVariants = {
  default: "border-line bg-surface text-ink hover:bg-surface-2",
  primary: "border-transparent bg-ink text-bg hover:opacity-90",
  ghost: "border-transparent bg-transparent text-ink-2 hover:bg-surface-2 hover:text-ink",
  accent: "border-transparent bg-accent text-accent-ink hover:opacity-90",
};
const buttonSizes = { sm: "h-8 px-2.5 text-[13px]", md: "h-9 px-3.5", icon: "h-9 w-9" };

export type ButtonVariant = keyof typeof buttonVariants;
export function buttonClass(variant: ButtonVariant = "default", size: keyof typeof buttonSizes = "md", className?: string) {
  return cn(buttonBase, buttonVariants[variant], buttonSizes[size], className);
}

export function LinkButton({
  href,
  variant = "default",
  size = "md",
  className,
  children,
  ...rest
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: keyof typeof buttonSizes }) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}

export function Stat({ label, value, hint, tone }: { label: ReactNode; value: ReactNode; hint?: ReactNode; tone?: "ok" | "bad" }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <div className="eyebrow">{label}</div>
      <div className={cn("tnum mt-1 font-display text-2xl font-semibold tracking-tight", tone === "ok" && "text-ok", tone === "bad" && "text-bad")}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-ink-3">{hint}</div>}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong bg-surface px-6 py-10 text-center">
      <p className="font-display text-base font-semibold text-ink">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-ink-2">{children}</div>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Callout({ tone = "info", title, children, className }: { tone?: "info" | "warn" | "ok"; title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm leading-relaxed",
        tone === "info" && "border-line bg-surface-2 text-ink-2",
        tone === "warn" && "border-accent/30 bg-accent-soft text-ink",
        tone === "ok" && "border-ok/30 bg-ok-soft text-ink",
        className,
      )}
    >
      {title && <div className="mb-0.5 font-semibold text-ink">{title}</div>}
      {children}
    </div>
  );
}

export function ExternalLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer external" className={cn("break-words text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent", className)}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
      <span aria-hidden="true"> ↗</span>
    </a>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-ink-3">{children}</kbd>;
}
