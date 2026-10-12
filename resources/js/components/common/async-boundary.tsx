import type { ReactNode } from 'react';

import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { LoadingState } from './loading-state';

export function AsyncBoundary({
    status,
    isEmpty,
    errorMessage,
    empty,
    onRetry,
    children,
    loadingLabel,
}: {
    status: 'idle' | 'loading' | 'success' | 'error';
    isEmpty?: boolean;
    errorMessage?: string;
    empty?: ReactNode;
    onRetry?: () => void;
    loadingLabel?: string;
    children: ReactNode;
}) {
    if (status === 'error') {
        return <ErrorState description={errorMessage} onRetry={onRetry} />;
    }

    if (status === 'loading' || status === 'idle') {
        return <LoadingState label={loadingLabel} />;
    }

    if (isEmpty) {
        return <>{empty}</>;
    }

    return <>{children}</>;
}
