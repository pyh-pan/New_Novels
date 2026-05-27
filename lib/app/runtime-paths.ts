export function getRuntimeBasePath() {
  if (typeof window === "undefined") {
    return "";
  }

  const match = window.location.pathname.match(/^\/s\/[^/]+(?=\/|$)/);
  return match?.[0] ?? "";
}

export function withRuntimeBasePath(path: string) {
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    /^[a-z][a-z0-9+.-]*:/i.test(path)
  ) {
    return path;
  }

  const basePath = getRuntimeBasePath();
  if (!basePath || path === basePath || path.startsWith(`${basePath}/`)) {
    return path;
  }

  return `${basePath}${path}`;
}

export function fetchAppPath(path: string, init?: RequestInit) {
  const resolvedPath = withRuntimeBasePath(path);
  return init ? fetch(resolvedPath, init) : fetch(resolvedPath);
}

export function navigateToAppPath(path: string) {
  window.location.href = withRuntimeBasePath(path);
}
