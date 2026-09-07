export type TokenProvider = () => Promise<string | undefined>;

export interface IntegrationClientOptions {
  baseUrl: string;
  getAccessToken: TokenProvider;
}

export class IntegrationClient {
  constructor(private readonly options: IntegrationClientOptions) {}

  async get<T>(path: string, signal?: AbortSignal): Promise<T> {
    const token = await this.options.getAccessToken();
    const response = await fetch(new URL(path, this.options.baseUrl), {
      signal,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    if (!response.ok) throw new Error(`Integration request failed (${response.status})`);
    return response.json() as Promise<T>;
  }

  async post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    const token = await this.options.getAccessToken();
    const response = await fetch(new URL(path, this.options.baseUrl), {
      method: 'POST', signal, credentials: 'include',
      headers: {
        Accept: 'application/json', 'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`Integration request failed (${response.status})`);
    return response.json() as Promise<T>;
  }
}
