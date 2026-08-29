import type React from "react";

declare global {
  /** Minimal `PageProps` shape for App Router pages. */
  type PageProps<Route extends string = string> = {
    params: Record<string, string>;
    searchParams?: Record<string, string | string[]>;
  };

  /** Minimal `LayoutProps` shape for App Router layouts. */
  type LayoutProps<Route extends string = string> = {
    children: React.ReactNode;
    params?: Record<string, string>;
  };

  /** Minimal `RouteContext` for route handlers. */
  type RouteContext<Route extends string = string> = {
    params: Record<string, string>;
  };
}

export {};
