import { fireEvent, render, screen } from "@testing-library/react";
import { TemplatePositionRow } from "./template-position-row";

it("keeps removal accessible and updates quantity independently of the article", () => {
  const onUpdate = vi.fn();
  const onRemove = vi.fn();
  render(<TemplatePositionRow articles={[{ id: "a", name: "Verbandpäckchen mit besonders langer Produktbezeichnung" }]} position={{ articleId: "a", moduleName: "", requiredQuantity: 2, critical: false }} index={0} count={2} isSubmitting={false} onUpdate={onUpdate} onRemove={onRemove} onMove={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Sollmenge"), { target: { value: "3" } });
  expect(onUpdate).toHaveBeenCalledWith({ requiredQuantity: 3 });
  fireEvent.click(screen.getByRole("button", { name: "Position 1 entfernen" }));
  expect(onRemove).toHaveBeenCalledOnce();
});
