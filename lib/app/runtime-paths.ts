const APP_ROUTE_SUFFIXES = [
  /^\/cases\/[^/]+\/accuse\/?$/,
  /^\/cases\/[^/]+\/?$/,
  /^\/studio\/cases\/[^/]+\/?$/,
  /^\/studio\/?$/,
  /^\/accuse\/?$/,
  /^\/health\/?$/
];

function trimTrailingSlash(path: string) {
  if (path === "/") {
    return "";
  }

  return path.replace(/\/+$/, "");
}

function normalizeBasePath(path: string) {
  return trimTrailingSlash(path) || "";
}

function getBaseElementPath() {
  if (typeof document === "undefined") {
    return "";
  }

  const baseHref = document.querySelector("base[href]")?.getAttribute("href");
  if (!baseHref) {
    return "";
  }

  try {
    return normalizeBasePath(new URL(baseHref, window.location.origin).pathname);
  } catch {
    return "";
  }
}

function getMetaEntryPath() {
  if (typeof document === "undefined") {
    return "";
  }

  const metaEntryPath = document
    .querySelector('meta[name="new-novels-entry-path"]')
    ?.getAttribute("content");

  return metaEntryPath ? normalizeBasePath(metaEntryPath) : "";
}

function inferBasePathFromCurrentRoute(pathname: string) {
  const normalizedPathname = pathname.startsWith("/") ? pathname : `/${pathname}`;

  for (const routeSuffix of APP_ROUTE_SUFFIXES) {
    const segments = normalizedPathname.split("/");
    for (let index = 0; index < segments.length; index += 1) {
      const candidateSuffix = `/${segments.slice(index).join("/")}`;
      if (routeSuffix.test(candidateSuffix)) {
        return normalizeBasePath(`/${segments.slice(1, index).join("/")}`);
      }
    }
  }

  return normalizeBasePath(normalizedPathname);
}

export function getRuntimeBasePath() {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    getMetaEntryPath() ||
    getBaseElementPath() ||
    inferBasePathFromCurrentRoute(window.location.pathname)
  );
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
