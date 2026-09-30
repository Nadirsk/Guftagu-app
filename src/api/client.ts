import * as FileSystem from 'expo-file-system/legacy';

/**
 * Every Laravel response uses the same envelope (docs/03 §2.1):
 *   { success, message, data, error: { code, details }, meta }
 * so one request helper unwraps all of them — there is no per-endpoint client.
 */
type Envelope<T> = {
  success: boolean;
  message: string;
  data?: T;
  error?: { code: string; details?: unknown };
};

/**
 * From `.env` (see .env.example). Expo only inlines `process.env.EXPO_PUBLIC_*`
 * when it is written out in full like this — reading it through a variable or a
 * helper gives undefined at runtime.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /**
   * Laravel sends field errors as `{ field: [message, ...] }`. Screens show one
   * line, so this picks the first one rather than making every caller dig.
   */
  get firstFieldError(): string | undefined {
    if (this.code !== 'VALIDATION_ERROR' || typeof this.details !== 'object' || !this.details) {
      return undefined;
    }
    const messages = Object.values(this.details as Record<string, string[]>)[0];
    return Array.isArray(messages) ? messages[0] : undefined;
  }

  /** What a screen should actually show the user. */
  get displayMessage(): string {
    return this.firstFieldError ?? this.message;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
};

function requireBaseUrl(): string {
  if (!API_BASE_URL) {
    throw new ApiError(
      'NO_API_URL',
      'EXPO_PUBLIC_API_BASE_URL is not set — copy mobile/.env.example to mobile/.env, then restart with `npx expo start -c`',
      0,
    );
  }
  return API_BASE_URL;
}

/** Turns a response — however it was fetched — into `data`, or into an ApiError. */
function unwrap<T>(status: number, rawBody: string): T {
  let payload: Envelope<T> | null = null;
  try {
    payload = JSON.parse(rawBody) as Envelope<T>;
  } catch {
    payload = null;
  }

  if (status < 200 || status >= 300 || !payload?.success) {
    throw new ApiError(
      payload?.error?.code ?? 'HTTP_ERROR',
      payload?.message ?? `Request failed (${status})`,
      status,
      payload?.error?.details,
    );
  }

  return payload.data as T;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;
  const base = requireBaseUrl();

  // JSON only — a file goes through `uploadFile`, for the reason written there.
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : null),
        ...(token ? { Authorization: `Bearer ${token}` } : null),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    // A dead server and a phone with no signal look the same from here, and the
    // fix is the same too: check the connection and the API base URL. What the
    // platform said is kept on the end, because not every throw from here is
    // actually the network — see `uploadFile`.
    const detail = e instanceof Error && e.message ? ` (${e.message})` : '';
    throw new ApiError('NETWORK', `Could not reach the server at ${base}${detail}`, 0);
  }

  return unwrap<T>(response.status, await response.text());
}

export type CursorMeta = {
  next_cursor?: string | null;
  has_more?: boolean;
  [key: string]: unknown;
};

export type ApiResponseWithMeta<T, M = CursorMeta> = {
  data: T;
  meta?: M;
};

export async function apiWithMeta<T, M = CursorMeta>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponseWithMeta<T, M>> {
  const { method = 'GET', body, token } = options;
  const base = requireBaseUrl();

  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : null),
        ...(token ? { Authorization: `Bearer ${token}` } : null),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    const detail = e instanceof Error && e.message ? ` (${e.message})` : '';
    throw new ApiError('NETWORK', `Could not reach the server at ${base}${detail}`, 0);
  }

  const rawBody = await response.text();
  let payload: (Envelope<T> & { meta?: M }) | null = null;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    payload = null;
  }

  if (response.status < 200 || response.status >= 300 || !payload?.success) {
    throw new ApiError(
      payload?.error?.code ?? 'HTTP_ERROR',
      payload?.message ?? `Request failed (${response.status})`,
      response.status,
      payload?.error?.details,
    );
  }

  return { data: payload.data as T, meta: payload.meta };
}

/**
 * Sending a picked photo or clip to an endpoint that takes one file.
 *
 * Not `fetch` with a FormData file part: that hands the URI to React Native's
 * own multipart assembler, which has to open it and read it into the request
 * before anything is sent. When it cannot open the URI — which is the common
 * case for a video picked out of the gallery — it rejects the whole request
 * without ever opening a socket, and the caller sees a thrown fetch that looks
 * exactly like a dead network.
 *
 * `uploadAsync` streams the file natively from its path instead, so the URI is
 * resolved by the platform that produced it and a large clip never has to be
 * held in memory.
 */
export async function uploadFile<T>(
  path: string,
  file: { uri: string; mime: string },
  token?: string | null,
): Promise<T> {
  const base = requireBaseUrl();

  let result: FileSystem.FileSystemUploadResult;
  try {
    result = await FileSystem.uploadAsync(`${base}${path}`, file.uri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      // `MediaController::store` reads `file`.
      fieldName: 'file',
      mimeType: file.mime,
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : null),
      },
    });
  } catch (e) {
    throw new ApiError(
      'UPLOAD_FAILED',
      e instanceof Error && e.message ? e.message : `Could not upload to ${base}`,
      0,
    );
  }

  return unwrap<T>(result.status, result.body);
}
