import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TemplateListRow } from "./template-list-row";

it("requires a PDF name choice and includes the selected mode in the export link", async () => {
  render(<TemplateListRow template={{ id: "t1", name: "SAN", version: 3, positions: [] }} isSubmitting={false} onDelete={vi.fn()} onDuplicate={vi.fn()} onEdit={vi.fn()} />);
  expect(screen.queryByRole("link", { name: "PDF öffnen" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "SAN v3 als PDF exportieren" }));
  await waitFor(() => expect(screen.getByRole("dialog", { name: "PDF exportieren" })).toBeVisible());
  const choice = screen.getByLabelText("Artikelbezeichnung");
  expect(choice).toHaveValue("short");
  expect(screen.getByRole("link", { name: "PDF öffnen" })).toHaveAttribute("href", expect.stringContaining("articleNameMode=short"));
  for (const mode of ["full", "both"]) {
    fireEvent.change(choice, { target: { value: mode } });
    expect(screen.getByRole("link", { name: "PDF öffnen" })).toHaveAttribute("href", expect.stringContaining(`articleNameMode=${mode}`));
  }
});
