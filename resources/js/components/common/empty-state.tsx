import { Inbox } from 'lucide-react';

import { cn } from '../../lib/cn';
import { Button } from '../ui/button';

export function EmptyState({
    icon: Icon = Inbox,
    title,
    description,
    action,
    className,
}: {
    icon?: typeof Inbox;
    title: string;
    description?: string;
    action?: { label: string; onClick?: () => void; href?: string };
    className?: string;
}) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 bg-ink-50/40 px-5 py-8 text-center',
                className,
            )}
        >
            <span className="grid size-11 place-items-center rounded-xl bg-white text-ink-400 shadow-soft ring-1 ring-ink-100">
                <Icon aria-hidden="true" className="size-5" />
            </span>
            <p className="mt-3 text-sm font-semibold text-ink-800">{title}</p>
            {description && <p className="mt-1 max-w-56 text-xs leading-relaxed text-ink-500">{description}</p>}
            {action?.href ? (
                <a href={action.href} className="mt-4 inline-flex">
                    <Button variant="outline" size="sm">
                        {action.label}
                    </Button>
                </a>
            ) : action?.onClick ? (
                <Button variant="outline" size="sm" className="mt-4" onClick={action.onClick}>
                    {action.label}
                </Button>
            ) : null}
        </div>
    );
}
