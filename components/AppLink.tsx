"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { useEffect, useState } from "react";
import { withRuntimeBasePath } from "../lib/app/runtime-paths";

type AppLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  children: ReactNode;
};

export default function AppLink({ href, children, ...props }: AppLinkProps) {
  const [resolvedHref, setResolvedHref] = useState(href);

  useEffect(() => {
    setResolvedHref(withRuntimeBasePath(href));
  }, [href]);

  return (
    <Link href={resolvedHref} {...props}>
      {children}
    </Link>
  );
}
