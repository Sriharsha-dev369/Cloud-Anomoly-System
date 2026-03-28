// Parses AWS_INSTANCE_MAP env var (format: "res-001:i-0abc,res-002:i-0def")
// into a lookup map. Cached at module level since the env var doesn't change at runtime.
function buildInstanceMap(): Record<string, string> {
  const raw = process.env.AWS_INSTANCE_MAP ?? '';
  const map: Record<string, string> = {};
  for (const entry of raw.split(',')) {
    const [resourceId, instanceId] = entry.trim().split(':');
    if (resourceId && instanceId) map[resourceId] = instanceId;
  }
  return map;
}

const instanceMap = buildInstanceMap();

// Resolves a resourceId to an EC2 instance ID.
// Explicit mapping takes priority; falls back to treating the ID directly
// as an instance ID if it starts with 'i-'.
export function getInstanceId(resourceId: string): string | null {
  return instanceMap[resourceId] ?? (resourceId.startsWith('i-') ? resourceId : null);
}

// Returns all mapped entries as an array (used by liveResourceController).
export function getInstanceEntries(): Array<{ resourceId: string; instanceId: string }> {
  return Object.entries(instanceMap).map(([resourceId, instanceId]) => ({ resourceId, instanceId }));
}
