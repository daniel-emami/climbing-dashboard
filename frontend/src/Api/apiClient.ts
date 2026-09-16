export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

type ApiRequestOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: BodyInit | null;
  headers?: HeadersInit;
};

export function apiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${API_BASE_URL}${path}`;
}

export async function apiJson<T>(
  path: string,
  options: ApiRequestOptions = {},
  fallbackMessage = "API request failed"
): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...options,
    credentials: "include",
    headers: {
      ...options.headers
    }
  });
  return parseJsonResponse<T>(response, fallbackMessage);
}

export async function apiJsonBody<T>(
  path: string,
  body: object,
  options: ApiRequestOptions = {},
  fallbackMessage = "API request failed"
): Promise<T> {
  return apiJson<T>(
    path,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      },
      body: JSON.stringify(body)
    },
    fallbackMessage
  );
}

export async function apiForm<T>(
  path: string,
  formData: FormData,
  options: ApiRequestOptions = {},
  fallbackMessage = "API request failed"
): Promise<T> {
  return apiJson<T>(
    path,
    {
      ...options,
      body: formData
    },
    fallbackMessage
  );
}

export async function apiBlob(
  path: string,
  options: ApiRequestOptions = {},
  fallbackMessage = "API request failed"
): Promise<Blob> {
  const response = await fetch(apiUrl(path), {
    ...options,
    credentials: "include",
    headers: {
      ...options.headers
    }
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail ?? `${fallbackMessage} (${response.status})`);
  }
  return response.blob();
}

async function parseJsonResponse<T>(
  response: Response,
  fallbackMessage: string
): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail ?? `${fallbackMessage} (${response.status})`);
  }
  return response.json() as Promise<T>;
}
