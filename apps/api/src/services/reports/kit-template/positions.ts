export type KitTemplatePdfRecord = {
  id: string;
  name: string;
  version: number;
  positions: Array<{
    moduleName: string | null;
    requiredQuantity: number;
    critical: boolean;
    article: { name: string; unit: string };
  }>;
};

export function groupTemplatePositions(positions: KitTemplatePdfRecord["positions"]) {
  const groups: Array<{ name: string; positions: KitTemplatePdfRecord["positions"] }> = [];
  for (const position of positions) {
    const name = position.moduleName?.trim() || "Ohne Modul";
    const previous = groups.at(-1);
    if (previous?.name === name) previous.positions.push(position);
    else groups.push({ name, positions: [position] });
  }
  return groups;
}
