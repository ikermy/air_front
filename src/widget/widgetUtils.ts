/** HTTP API types for /v1/widget routes. */

export interface WidgetExamRequest {
  widgetCode: string;
  /** Responder ID. */
  c: number | string;
}

export interface WidgetExamResponse {
  token: string;
}

export interface WidgetValidateResponse {
  // Empty object on success.
}

export interface WidgetRefreshRequest {
  /** Optional because the preferred transport is Authorization: Bearer. */
  oldToken?: string;
}

export interface WidgetRefreshResponse {
  token: string;
}

export interface WidgetUsernameResponse {
  name?: string;
  message?: "No user name";
}

export interface WidgetDialogMessage {
  creator: number;
  message: {
    message?: string;
    action?: Record<string, unknown>;
    [key: string]: unknown;
  };
  timestamp: string;
}

export interface WidgetDialogResponse {
  /** JSON string containing WidgetDialogMessage[]. */
  Data: string | null;
  Date: string;
  Model: string;
  Responder: string;
  Type: string;
}

export interface WidgetDataRequest {
  /** Preferred transport is Authorization: Bearer; body token remains supported. */
  token?: string;
  name: string;
  content: string;
}

export interface WidgetEventsTicketResponse {
  ticket: string;
}

export interface WidgetSseAssistEvent {
  Type: "assist";
  Content: string | {
    message?: string;
    action?: {
      send_files?: WidgetSseFile[];
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  Name: string;
  Timestamp: string;
}

export interface WidgetSseUserEvent {
  Type: "user";
  Content: {
    message: string;
    [key: string]: unknown;
  };
  Name: string;
  Timestamp: string;
}

export interface WidgetSseFile {
  type?: string;
  url: string;
  file_name?: string;
  caption?: string;
  [key: string]: unknown;
}

export interface WidgetSseShutdownEvent {
  type: "shutdown";
  message: string;
}

export interface WidgetSseTimeoutEvent {
  type: "timeout";
  message: string;
}

export type WidgetSseMessage = WidgetSseAssistEvent | WidgetSseUserEvent;

export interface WidgetApiError {
  error: string;
  message?: string;
}

export type WidgetApiStatus =
  | 200
  | 400
  | 401
  | 402
  | 403
  | 404
  | 408
  | 429
  | 500
  | 502
  | 503;

export const WIDGET_API_ROUTES = {
  exam: {
    method: "POST",
    path: "/v1/widget/exam",
  },
  validate: {
    method: "GET",
    path: "/v1/widget/validate",
  },
  refresh: {
    method: "POST",
    path: "/v1/widget/refresh",
  },
  username: {
    method: "GET",
    path: "/v1/widget/username",
  },
  dialog: {
    method: "GET",
    path: "/v1/widget/dialog",
  },
  data: {
    method: "POST",
    path: "/v1/widget/data",
  },
  events: {
    method: "GET",
    path: "/v1/widget/events",
  },
  eventsTicket: {
    method: "POST",
    path: "/v1/widget/events-ticket",
  },
} as const;

export type WidgetApiRoute =
  (typeof WIDGET_API_ROUTES)[keyof typeof WIDGET_API_ROUTES];

export interface WidgetApiRouteMap {
  exam: {
    request: WidgetExamRequest;
    response: WidgetExamResponse;
  };
  validate: {
    request: undefined;
    response: WidgetValidateResponse;
  };
  refresh: {
    request: WidgetRefreshRequest;
    response: WidgetRefreshResponse;
  };
  username: {
    request: undefined;
    response: WidgetUsernameResponse;
  };
  dialog: {
    request: { name: string };
    response: WidgetDialogResponse;
  };
  data: {
    request: WidgetDataRequest;
    response: Record<string, never>;
  };
  events: {
    request: { ticket: string };
    response: WidgetSseMessage;
  };
  eventsTicket: {
    request: undefined;
    response: WidgetEventsTicketResponse;
  };
}

export type WidgetApiRouteName = keyof WidgetApiRouteMap;

const WIDGET_API_BASE =
    process.env.LAND_URL;

/** Typed API helpers used by the widget UI. */
async function widgetRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${WIDGET_API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });

  if (!response.ok) {
    const error = new Error(`Widget request failed: ${response.status}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return undefined as T;

  // Некоторые backend-методы (например /v1/widget/available)
  // возвращают 2xx без тела ответа.
  const body = await response.text();
  if (!body.trim()) return undefined as T;

  return JSON.parse(body) as T;
}

export async function refreshWidgetToken(oldToken?: string): Promise<string | null> {
  try {
    const data = await widgetRequest<WidgetRefreshResponse>(WIDGET_API_ROUTES.refresh.path, {
      method: "POST",
      headers: oldToken ? { Authorization: `Bearer ${oldToken}` } : undefined,
      body: JSON.stringify({ oldToken }),
    });
    return data.token || null;
  } catch {
    return null;
  }
}

export async function validateWidgetToken(token: string): Promise<string | null> {
  try {
    await widgetRequest<WidgetValidateResponse>(WIDGET_API_ROUTES.validate.path, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return token;
  } catch (error) {
    if ((error as { status?: number }).status === 401) {
      return refreshWidgetToken(token);
    }
    return null;
  }
}

export async function getWidgetUsername(token: string): Promise<WidgetUsernameResponse> {
  return widgetRequest<WidgetUsernameResponse>(WIDGET_API_ROUTES.username.path, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function checkWidgetAvailability(): Promise<void> {
  await widgetRequest<Record<string, never>>('/v1/widget/available');
}

export async function requestWidgetExam(request: WidgetExamRequest): Promise<WidgetExamResponse> {
  return widgetRequest<WidgetExamResponse>(WIDGET_API_ROUTES.exam.path, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export interface FetchWidgetUsernameOptions {
  token: string;
  setToken: (token: string) => void;
  setUserName: (name: string | null) => void;
}

export async function fetchWidgetUsername(
  {token, setToken, setUserName}: FetchWidgetUsernameOptions,
  maxRetries = 3,
): Promise<void> {
  const validToken = await validateWidgetToken(token);
  if (!validToken) return;
  setToken(validToken);

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const data = await getWidgetUsername(validToken);
      setUserName(data.name || null);
      return;
    } catch (error) {
      if ((error as { status?: number }).status !== 429 || attempt === maxRetries) return;
      await new Promise((resolve) => setTimeout(resolve, 2 ** (attempt + 1) * 1000));
    }
  }
}

export async function sendWidgetMessage(
  token: string,
  name: string,
  content: string,
): Promise<Record<string, never>> {
  return widgetRequest<Record<string, never>>(WIDGET_API_ROUTES.data.path, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ token, name, content } satisfies WidgetDataRequest),
  });
}

export async function createWidgetEventsTicket(token: string): Promise<string> {
  const data = await widgetRequest<WidgetEventsTicketResponse>(WIDGET_API_ROUTES.eventsTicket.path, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.ticket;
}

export function getWidgetEventsUrl(ticket: string): string {
  return `${WIDGET_API_ROUTES.events.path}?ticket=${encodeURIComponent(ticket)}`;
}
