import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bootstrap, BootstrapFailure } from "./bootstrap";

afterEach(cleanup);

describe("bootstrap", () => {
  it("renders the application only after the mock worker starts", async () => {
    const startWorker = vi.fn().mockResolvedValue(undefined);
    const renderApplication = vi.fn();
    const renderFailure = vi.fn();

    await bootstrap(startWorker, renderApplication, renderFailure);

    expect(startWorker).toHaveBeenCalledOnce();
    expect(renderApplication).toHaveBeenCalledOnce();
    expect(renderFailure).not.toHaveBeenCalled();
  });

  it("renders the recovery boundary when the mock worker fails", async () => {
    const startWorker = vi.fn().mockRejectedValue(new Error("worker failed"));
    const renderApplication = vi.fn();
    const renderFailure = vi.fn();

    await bootstrap(startWorker, renderApplication, renderFailure);

    expect(renderApplication).not.toHaveBeenCalled();
    expect(renderFailure).toHaveBeenCalledOnce();
  });
});

describe("BootstrapFailure", () => {
  it("offers a retry action", async () => {
    const reload = vi.fn();
    render(<BootstrapFailure onRetry={reload} />);

    expect(screen.getByRole("alert")).toHaveTextContent("애플리케이션을 시작하지 못했습니다.");
    await userEvent.setup().click(screen.getByRole("button", { name: "다시 시도" }));

    expect(reload).toHaveBeenCalledOnce();
  });
});
