import { fireEvent, render, screen } from "@testing-library/react";
import { Dialog } from "./ui";

describe("Dialog", () => {
  it("renders a dedicated heading container and close button hook for responsive layout", () => {
    const onClose = vi.fn();

    render(
      <Dialog description="Chargengenaue Teilfüllungen." onClose={onClose} open title="Nachfüllauftrag">
        <p>Inhalt</p>
      </Dialog>,
    );

    const dialog = screen.getByRole("dialog", { name: "Nachfüllauftrag" });
    expect(dialog.querySelector(".modal-heading")).not.toBeNull();
    expect(dialog).toHaveAttribute("data-motion-preset", "panel-enter");
    const closeButton = screen.getByRole("button", { name: "Dialog schließen" });
    expect(closeButton).toHaveClass("modal-close-button");

    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("supports wider dialog layouts with dedicated body styling hooks", () => {
    render(
      <Dialog bodyClassName="confirm-dialog-body" className="custom-modal" onClose={vi.fn()} open size="wide" title="Bestätigung">
        <p>Inhalt</p>
      </Dialog>,
    );

    const dialog = screen.getByRole("dialog", { name: "Bestätigung" });
    expect(dialog).toHaveClass("modal-dialog-wide");
    expect(dialog).toHaveClass("custom-modal");
    expect(dialog).toHaveAttribute("data-motion-mode", "full");
    expect(dialog.querySelector(".confirm-dialog-body")).not.toBeNull();
  });
});
