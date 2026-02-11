export async function postRequest(endpoint: string, payload: any) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`POST ${endpoint} failed`);
  }

  return response.json();
}
