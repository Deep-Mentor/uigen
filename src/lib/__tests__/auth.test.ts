// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";

// Mock server-only so it doesn't throw in test environment
vi.mock("server-only", () => ({}));

// Cookie store mock shared across createSession / getSession / deleteSession
const cookieStore = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(cookieStore)),
}));

import { createSession, getSession, deleteSession, verifySession } from "@/lib/auth";
import { NextRequest } from "next/server";

beforeEach(() => {
  vi.clearAllMocks();
  // Clear any JWT_SECRET env override between tests
  delete process.env.JWT_SECRET;
});

describe("createSession", () => {
  test("sets an httpOnly cookie with the auth token", async () => {
    await createSession("user-1", "user@example.com");

    expect(cookieStore.set).toHaveBeenCalledOnce();
    const [cookieName, token, options] = cookieStore.set.mock.calls[0];
    expect(cookieName).toBe("auth-token");
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
    expect(options.httpOnly).toBe(true);
    expect(options.path).toBe("/");
  });

  test("sets cookie expiry ~7 days in the future", async () => {
    const before = Date.now();
    await createSession("user-1", "user@example.com");
    const after = Date.now();

    const expires: Date = cookieStore.set.mock.calls[0][2].expires;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(expires.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expires.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });
});

describe("getSession", () => {
  test("returns null when no cookie is present", async () => {
    cookieStore.get.mockReturnValue(undefined);
    const session = await getSession();
    expect(session).toBeNull();
  });

  test("returns null for a tampered/invalid token", async () => {
    cookieStore.get.mockReturnValue({ value: "not.a.valid.jwt" });
    const session = await getSession();
    expect(session).toBeNull();
  });

  test("returns session payload for a valid token created by createSession", async () => {
    // Capture the token written by createSession
    let capturedToken = "";
    cookieStore.set.mockImplementation((_name: string, token: string) => {
      capturedToken = token;
    });

    await createSession("user-42", "hello@example.com");

    // Now simulate getSession reading that token back
    cookieStore.get.mockReturnValue({ value: capturedToken });
    const session = await getSession();

    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-42");
    expect(session?.email).toBe("hello@example.com");
  });
});

describe("deleteSession", () => {
  test("deletes the auth-token cookie", async () => {
    await deleteSession();
    expect(cookieStore.delete).toHaveBeenCalledWith("auth-token");
  });
});

describe("verifySession", () => {
  test("returns null when request carries no auth cookie", async () => {
    const request = new NextRequest("http://localhost/api/test");
    const session = await verifySession(request);
    expect(session).toBeNull();
  });

  test("returns null for an invalid token in the request cookie", async () => {
    const request = new NextRequest("http://localhost/api/test", {
      headers: { cookie: "auth-token=bad.token.here" },
    });
    const session = await verifySession(request);
    expect(session).toBeNull();
  });

  test("returns session payload for a valid token in the request cookie", async () => {
    // Use createSession to mint a real token
    let capturedToken = "";
    cookieStore.set.mockImplementation((_name: string, token: string) => {
      capturedToken = token;
    });
    await createSession("user-99", "verify@example.com");

    const request = new NextRequest("http://localhost/api/test", {
      headers: { cookie: `auth-token=${capturedToken}` },
    });
    const session = await verifySession(request);

    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-99");
    expect(session?.email).toBe("verify@example.com");
  });
});
