import type { Paginated, User } from "./types";
import { showToast } from "@/components/toast";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:8080";

const ACCESS_TOKEN_KEY = "comm-connect.access-token";
const REFRESH_TOKEN_KEY = "comm-connect.refresh-token";
const USER_KEY = "comm-connect.user";

export function getSession() {
    if (typeof window === "undefined") return null;
    const accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    const user = window.localStorage.getItem(USER_KEY);
    return accessToken ? { accessToken, user: user ? (JSON.parse(user) as User) : null } : null;
}

export function saveSession(session: { accessToken: string; refreshToken: string; user: User }) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
    window.localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
    window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearSession() {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
    const session = getSession();
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);

    const response = await fetch(`${API_URL}${path}`, { ...init, headers });
    if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
        const message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
        const errorMessage = message ?? "Something went wrong. Please try again.";
        showToast(errorMessage, "error");
        throw new Error(errorMessage);
    }
    return response.json() as Promise<T>;
}

export async function getList<T>(path: string) {
    const payload = await api<unknown>(path);

    if (Array.isArray(payload)) {
        return {
            data: payload as T[],
            total: payload.length,
            page: 1,
            limit: payload.length,
            pages: payload.length ? 1 : 0,
        } satisfies Paginated<T>;
    }

    const response = payload as Partial<Paginated<T>> | null;
    const data = Array.isArray(response?.data) ? response.data : [];
    const limit = typeof response?.limit === "number" ? response.limit : data.length;

    return {
        data,
        total: typeof response?.total === "number" ? response.total : data.length,
        page: typeof response?.page === "number" ? response.page : 1,
        limit,
        pages: typeof response?.pages === "number" ? response.pages : (data.length ? 1 : 0),
    } satisfies Paginated<T>;
}