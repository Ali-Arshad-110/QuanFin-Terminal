import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;
            return (
                <div className="flex flex-col items-center justify-center p-8 bg-surface rounded-2xl border border-rose-500/20 text-center">
                    <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
                    <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">Panel Crash</h3>
                    <p className="text-[10px] text-text-muted mt-1 italic">Something went wrong while rendering this component.</p>
                    <button
                        className="mt-4 px-4 py-1.5 bg-indigo-500 text-white text-[10px] font-black rounded-lg uppercase tracking-widest"
                        onClick={() => this.setState({ hasError: false })}
                    >
                        Retry
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
