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
    const closeButton = screen.getByRole("button", { name: "Dialog schließen" });
    expect(closeButton).toHaveClass("modal-close-button");

    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
