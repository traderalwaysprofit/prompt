import { SYSTEM_TOOL_DEFINITIONS, type ToolDefinition } from "./schema.ts";

export interface OpenAIToolDefinition {
  type: "function";
  function: ToolDefinition;
}

export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: Omit<ToolDefinition["parameters"], "additionalProperties">;
}

export function toOpenAITools(
  definitions: ToolDefinition[] = SYSTEM_TOOL_DEFINITIONS,
): OpenAIToolDefinition[] {
  return definitions.map((definition) => ({
    type: "function",
    function: definition,
  }));
}

export function toGeminiFunctionDeclarations(
  definitions: ToolDefinition[] = SYSTEM_TOOL_DEFINITIONS,
): GeminiFunctionDeclaration[] {
  return definitions.map((definition) => {
    const { additionalProperties: _additionalProperties, ...parameters } = definition.parameters;
    return {
      name: definition.name,
      description: definition.description,
      parameters,
    };
  });
}
