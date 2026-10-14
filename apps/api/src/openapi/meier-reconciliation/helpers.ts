export function ref(name: string) {
  return { $ref: `#/components/schemas/${name}` };
}
export function objectSchema(
  properties: Record<string, unknown>,
  required: string[] = [],
) {
  return { type: "object", properties, required, additionalProperties: false };
}
