/** Keep cloud requests working with Electron's web security enabled. */
export async function desktopFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  if (process.env.MODE !== 'electron' || !process.env.PROD || !window.api)
    return fetch(url, options);
  const request = new Request(url, options);
  const headers: Record<string, string> = {};
  request.headers.forEach((value, name) => {
    headers[name] = value;
  });
  const result = (await window.api.invoke('cloud-request', {
    url,
    method: request.method,
    headers,
    body:
      request.method === 'GET' || request.method === 'HEAD'
        ? undefined
        : await request.arrayBuffer(),
  })) as { status: number; headers: [string, string][]; body: ArrayBuffer };
  return new Response(result.status === 204 ? null : result.body, {
    status: result.status,
    headers: result.headers,
  });
}
