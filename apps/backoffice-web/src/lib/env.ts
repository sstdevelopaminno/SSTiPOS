function stripTrailingEscapedNewlines(value: string): string {
  return value.replace(/(?:\\r\\n|\\n|\\r)+$/g, "");
}

export function readEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (typeof raw !== "string") {
    return undefined;
  }

  const normalized = stripTrailingEscapedNewlines(raw.trim());
  return normalized.length > 0 ? normalized : undefined;
}

export function readFirstEnv(names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = readEnv(name);
    if (value) return value;
  }

  return undefined;
}

export function readRequiredEnv(name: string, message?: string): string {
  const value = readEnv(name);
  if (!value) {
    throw new Error(message ?? `Missing required environment variable: ${name}`);
  }

  return value;
}

export function readRequiredFirstEnv(names: readonly string[], message?: string): string {
  const value = readFirstEnv(names);
  if (!value) {
    throw new Error(message ?? `Missing required environment variable: ${names.join(" or ")}`);
  }

  return value;
}
