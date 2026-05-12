/**
 * Safely extracts a human-readable error message from various error formats.
 * Prevents "Objects are not valid as a React child" crashes.
 */
export const extractErrorMessage = (err: any, fallback: string = 'An unexpected error occurred'): string => {
    if (!err) return fallback;

    // 1. Check for standard string or Error object
    if (typeof err === 'string') return err;
    if (err instanceof Error) return err.message;

    // 2. Handle Axios / API Response errors
    const response = err.response?.data;
    if (response) {
        // Handle FastAPI / Pydantic validation errors (detail is an array)
        if (Array.isArray(response.detail)) {
            return response.detail
                .map((d: any) => {
                    const loc = Array.isArray(d.loc) ? d.loc.join('.') : d.loc;
                    return `${loc ? `${loc}: ` : ''}${d.msg || JSON.stringify(d)}`;
                })
                .join('; ');
        }

        // Handle standard detail string or message
        if (typeof response.detail === 'string') return response.detail;
        if (typeof response.message === 'string') return response.message;
        if (typeof response.error === 'string') return response.error;

        // Fallback for nested summary
        try {
            return JSON.stringify(response);
        } catch {
            return fallback;
        }
    }

    // 3. Fallback to basic stringification if it's an object but not handled
    try {
        if (typeof err === 'object') {
            return err.message || JSON.stringify(err);
        }
    } catch {
        // ignore
    }

    return fallback;
};
