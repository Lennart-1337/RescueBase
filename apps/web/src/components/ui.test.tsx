import { fireEvent, render, screen } from "@testing-library/react";
import { Save } from "lucide-react";
import { Button, CheckboxField, Dialog } from "./ui";

describe("Button", () => {
  it("disables itself and shows a spinner while loading", () => {
    render(
      <Button loading type="button">
        <Save data-icon="inline-start" />
        Speichern
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Speichern" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.querySelector(".button-loading-icon")).not.toBeNull();
    expect(button.querySelector("[data-icon=\"inline-start\"]")).not.toBeNull();
  });
});

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

describe("CheckboxField", () => {
  it("renders a styled toggle with label copy and checked state hooks", () => {
    render(<CheckboxField checked label="Kritisch" onChange={() => undefined} />);

    const checkbox = screen.getByRole("checkbox", { name: "Kritisch" });
    expect(checkbox).toBeChecked();
    expect(checkbox.closest(".checkbox-field")).toHaveClass("checkbox-field-selected");
    expect(checkbox.closest(".checkbox-field")?.querySelector(".checkbox-indicator")).not.toBeNull();
    expect(checkbox.closest(".checkbox-field")?.querySelector(".checkbox-thumb")).not.toBeNull();
  });

  it("supports card presentation with secondary description copy", () => {
    render(
      <CheckboxField
        description="Gilt für alle Standorte."
        label="Alle Standorte"
        onChange={() => undefined}
        variant="card"
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Alle StandorteGilt für alle Standorte." });
    expect(checkbox.closest(".checkbox-field")).toHaveClass("checkbox-field-card");
    expect(screen.getByText("Gilt für alle Standorte.")).toBeInTheDocument();
  });
});
