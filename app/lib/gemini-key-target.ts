export const VERTEX_KEY_FORMAT = "vertex:PROJECT_ID:LOCATION:API_KEY";

export type GeminiKeyTarget =
  | { kind: "developer"; key: string }
  | { kind: "vertex"; key: string; project: string; location: string };

export function parseGeminiKeyTarget(rawKey: string): GeminiKeyTarget {
  const trimmed = rawKey.trim();
  if (!trimmed.toLowerCase().startsWith("vertex:")) {
    return { kind: "developer", key: trimmed };
  }

  const descriptor = trimmed.slice("vertex:".length);
  const [project = "", location = "", ...keyParts] = descriptor.split(":");
  const key = keyParts.join(":").trim();

  if (!project.trim() || !location.trim() || !key) {
    throw new Error(`Invalid Vertex key format. Use ${VERTEX_KEY_FORMAT}.`);
  }

  return {
    kind: "vertex",
    project: project.trim(),
    location: location.trim(),
    key,
  };
}

export function buildGeminiEndpoint(
  target: GeminiKeyTarget,
  model: string,
  method: "generateContent" | "countTokens",
): string {
  if (target.kind === "vertex") {
    return `https://aiplatform.googleapis.com/v1/projects/${encodeURIComponent(
      target.project,
    )}/locations/${encodeURIComponent(
      target.location,
    )}/publishers/google/models/${encodeURIComponent(model)}:${method}?key=${encodeURIComponent(
      target.key,
    )}`;
  }

  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:${method}?key=${encodeURIComponent(target.key)}`;
}

export function getGeminiApiKey(target: GeminiKeyTarget): string {
  return target.key;
}
