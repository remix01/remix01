import { NextResponse } from "next/server";
import { CURRENT_VERSION } from "./versions";

export interface CanonicalSuccessResponse<T = unknown> {
  ok: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface CanonicalErrorShape {
  code: string;
  message: string;
  details?: unknown;
}

export interface CanonicalErrorResponse {
  ok: false;
  error: CanonicalErrorShape;
}

export type CanonicalApiResponse<T = unknown> =
  | CanonicalSuccessResponse<T>
  | CanonicalErrorResponse;

/**
 * Canonical API envelope helper (success)
 */
export function ok<T>(
  data: T,
  meta?: Record<string, unknown>,
  status = 200,
): NextResponse<CanonicalSuccessResponse<T>> {
  return NextResponse.json(
    { ok: true, data, ...(meta ? { meta } : {}) },
    { status },
  );
}

/**
 * Canonical API envelope helper (error)
 */
export function fail(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
): NextResponse<CanonicalErrorResponse> {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    },
    { status },
  );
}

// -----------------------------------------------------------------------------
// Deprecated helpers kept for backwards compatibility
// -----------------------------------------------------------------------------

/** @deprecated Use `ok(data, meta?, status?)` instead. */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta: {
    version: string;
    requestId?: string;
    timestamp: string;
  };
}

/** @deprecated Use `fail(code, message, status?, details?)` instead. */
export interface ApiErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: unknown;
  meta: {
    version: string;
    requestId?: string;
    timestamp: string;
  };
}

/** @deprecated Use `ok(data, meta?, status?)` instead. */
export interface ApiPaginatedResponse<T = unknown> {
  success: true;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
  meta: {
    version: string;
    requestId?: string;
    timestamp: string;
  };
}

/** @deprecated Use `ok(data, meta?, status?)` instead. */
export function apiSuccess<T>(
  data: T,
  status = 200,
  requestId?: string,
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    meta: {
      version: CURRENT_VERSION,
      requestId,
      timestamp: new Date().toISOString(),
    },
  };

  return NextResponse.json(response, { status });
}

/** @deprecated Use `fail(code, message, status?, details?)` instead. */
export function apiError(
  message: string,
  code: string,
  status = 500,
  details?: unknown,
  requestId?: string,
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: message,
    code,
    details,
    meta: {
      version: CURRENT_VERSION,
      requestId,
      timestamp: new Date().toISOString(),
    },
  };

  return NextResponse.json(response, { status });
}

/** @deprecated Use `ok(data, meta?, status?)` instead. */
export function apiPaginated<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
  requestId?: string,
): NextResponse<ApiPaginatedResponse<T>> {
  const totalPages = Math.ceil(total / limit);
  const hasMore = page < totalPages;

  const response: ApiPaginatedResponse<T> = {
    success: true,
    data: items,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasMore,
    },
    meta: {
      version: CURRENT_VERSION,
      requestId,
      timestamp: new Date().toISOString(),
    },
  };

  return NextResponse.json(response, { status: 200 });
}
