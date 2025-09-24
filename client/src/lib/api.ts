export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  const isFormData = data instanceof FormData;
  
  const res = await fetch(url, {
    method,
    headers: data && !isFormData ? { "Content-Type": "application/json" } : {},
    body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || res.statusText);
  }

  return res;
}
