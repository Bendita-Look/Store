import { AuthenticationService } from "../auth/AuthenticationService";
import { XsuaaAuthHelper } from "../auth/providers/XsuaaAuthHelper";

const UNAVAILABLE_STATUSES = [0, 502, 503, 504];
const AUTHORIZATION_STATUSES = [401, 403];

export class BackendUnavailableError extends Error {
    public constructor() {
        super("Backend unavailable");
        this.name = "BackendUnavailableError";
    }
}

export class SessionExpiredError extends Error {
    public constructor() {
        super("Session expired");
        this.name = "SessionExpiredError";
    }
}

export class RequestFailedError extends Error {
    public constructor(message: string, public readonly status: number) {
        super(message);
        this.name = "RequestFailedError";
    }
}

const STORE_URL_HEADER = "X-Store-Url";

export function storeUrlHeader(): Record<string, string> {
    return { [STORE_URL_HEADER]: `${window.location.origin}${window.location.pathname}` };
}

export function buildAuthHeaders(headers: HeadersInit = {}): Headers {
    const result = new Headers(headers);
    const token = AuthenticationService.getSession()?.accessToken;

    result.set(STORE_URL_HEADER, storeUrlHeader()[STORE_URL_HEADER]);

    if (token) {
        result.set("Authorization", `Bearer ${token}`);
    }

    return result;
}

export async function adminRequest(path: string, init: RequestInit = {}): Promise<Response> {
    let response: Response;

    try {
        response = await fetch(`${XsuaaAuthHelper.getConfig().adminService}${path}`, {
            ...init,
            headers: buildAuthHeaders(init.headers)
        });
    } catch {
        throw new BackendUnavailableError();
    }

    if (response.status === 401) {
        AuthenticationService.notifySessionExpired();
        throw new SessionExpiredError();
    }

    if (!response.ok) {
        throw new RequestFailedError(await readErrorMessage(response), response.status);
    }

    return response;
}

async function readErrorMessage(response: Response): Promise<string> {
    try {
        const payload = await response.json() as { error?: { message?: string } };
        return payload.error?.message ?? response.statusText;
    } catch {
        return response.statusText;
    }
}

export function isAuthorizationError(error: unknown): boolean {
    return AUTHORIZATION_STATUSES.includes((error as { status?: number } | undefined)?.status ?? -1);
}

export function isAuthenticationError(error: unknown): boolean {
    return (error as { status?: number } | undefined)?.status === 401;
}

export function isSessionExpiredError(error: unknown): boolean {
    return error instanceof SessionExpiredError;
}

export function isBackendUnavailableError(error: unknown): boolean {
    const visited = new Set<unknown>();
    let current: unknown = error;

    while (current && typeof current === "object" && !visited.has(current)) {
        visited.add(current);

        if (current instanceof BackendUnavailableError || UNAVAILABLE_STATUSES.includes((current as { status?: number }).status ?? -1)) {
            return true;
        }

        current = (current as { cause?: unknown }).cause;
    }

    return false;
}
