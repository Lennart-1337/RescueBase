export type Schema = Record<string, unknown>;
export const string = { type: "string" };
export const boolean = { type: "boolean" };
export const integer = { type: "integer", minimum: 0 };
export const decimal = { type: "string", pattern: "^[0-9]+(\\.[0-9]+)?$" };
export const date = { type: "string", format: "date-time" };
export const ref = (name: string): Schema => ({
  $ref: `#/components/schemas/${name}`,
});
export const nullable = (schema: Schema): Schema => ({
  ...schema,
  nullable: true,
});
export const array = (items: Schema): Schema => ({ type: "array", items });
export const enumeration = (values: readonly string[]): Schema => ({
  type: "string",
  enum: [...values],
});
export const object = (
  properties: Record<string, Schema>,
  required = Object.keys(properties),
): Schema => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});
export const entity = (
  properties: Record<string, Schema>,
  extras: Record<string, Schema> = {},
): Schema =>
  object(
    {
      ...properties,
      id: string,
      version: integer,
      createdAt: date,
      updatedAt: date,
      ...extras,
    },
    [...Object.keys(properties), "id", "version", ...Object.keys(extras)],
  );
