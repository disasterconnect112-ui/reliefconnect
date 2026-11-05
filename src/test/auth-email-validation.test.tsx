import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(), signInWithPassword: vi.fn(), signInWithOtp: vi.fn(),
  error: vi.fn(), success: vi.fn(), navigate: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  useNavigate: () => mocks.navigate,
}));
vi.mock("@/components/AppShell", () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ session: null }) }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: mocks } }));
vi.mock("@/integrations/lovable/index", () => ({ lovable: { auth: {} } }));
vi.mock("sonner", () => ({ toast: mocks }));

import { Route } from "@/routes/auth";

function register(role: "volunteer" | "ngo", email: string) {
  const Component = Route.options.component;
  if (!Component) throw new Error("Missing auth page");
  render(<Component />);
  fireEvent.click(screen.getByRole("button", { name: "register" }));
  if (role === "ngo") {
    fireEvent.click(screen.getByRole("button", { name: "ngo" }));
    fireEvent.change(screen.getByPlaceholderText("orgName"), { target: { value: "Relief" } });
  }
  fireEvent.change(screen.getByPlaceholderText(role === "ngo" ? "contactPerson" : "fullName"), { target: { value: "Test User" } });
  fireEvent.change(screen.getByPlaceholderText("mobile"), { target: { value: "9999999999" } });
  fireEvent.change(screen.getByRole("textbox", { name: "email" }), { target: { value: email } });
  fireEvent.change(screen.getByPlaceholderText("password"), { target: { value: "test-password" } });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.signUp.mockResolvedValue({ data: { session: {} }, error: null });
  mocks.signInWithPassword.mockResolvedValue({ error: null });
});
afterEach(cleanup);

describe("email registration submission", () => {
  it.each([
    ["volunteer", "team@yahoo.com"],
    ["ngo", "team@gmail.com"],
  ] as const)("blocks invalid %s registration before any signup request", (role, email) => {
    register(role, email);
    fireEvent.click(screen.getByRole("button", { name: "createAccount" }));
    expect(mocks.signUp).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("textbox", { name: "email" }), { target: { value: role === "ngo" ? "team@relief.org" : "team@gmail.com" } });
    fireEvent.click(screen.getByRole("button", { name: "createAccount" }));
    expect(mocks.signUp).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["volunteer", "  Team@gmail.com  ", "Team@gmail.com"],
    ["ngo", "  team@relief-org2.org  ", "team@relief-org2.org"],
  ] as const)("submits the same normalized %s address that was validated", (role, email, normalized) => {
    register(role, email);
    fireEvent.blur(screen.getByRole("textbox", { name: "email" }));
    fireEvent.click(screen.getByRole("button", { name: "createAccount" }));
    expect(mocks.signUp).toHaveBeenCalledWith(expect.objectContaining({ email: normalized }));
  });

  it("does not apply registration patterns to existing-account sign-in", () => {
    register("volunteer", "existing.user@outlook.com");
    fireEvent.click(screen.getByRole("button", { name: "signIn" }));
    fireEvent.click(screen.getByRole("button", { name: "signIn" }).lastElementChild ?? screen.getAllByRole("button", { name: "signIn" })[1]);
    expect(mocks.signInWithPassword).toHaveBeenCalledWith(expect.objectContaining({ email: "existing.user@outlook.com" }));
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it("allows retry after a connection failure", async () => {
    mocks.signUp.mockRejectedValueOnce(new Error("Connection failed"));
    register("volunteer", "team@gmail.com");
    fireEvent.click(screen.getByRole("button", { name: "createAccount" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("authRequestFailed"));
    fireEvent.click(screen.getByRole("button", { name: "createAccount" }));
    expect(mocks.signUp).toHaveBeenCalledTimes(2);
  });
});