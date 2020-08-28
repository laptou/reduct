let netId: string | null = null;

export async function getNetId(): Promise<string> {
  if (netId) {
    return netId;
  }

  const response = await fetch('/auth/me');
  netId = await response.text();
  return netId;
}

