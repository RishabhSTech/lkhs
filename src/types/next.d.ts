import type React from "react";

declare global {
  /** Minimal `PageProps` shape for App Router pages. */
  type PageProps<Route extends string = string> = {
    params: Record<string, string | undefined>;
    searchParams: Record<string, string | string[] | undefined>;
  };

  /** Minimal `LayoutProps` shape for App Router layouts. */
  type LayoutProps<Route extends string = string> = {
    children: React.ReactNode;
    params?: Record<string, string | undefined>;
  };

  /** Minimal `RouteContext` for route handlers. */
  type RouteContext<Route extends string = string> = {
    params: Record<string, string | undefined>;
  };
}

export {};
