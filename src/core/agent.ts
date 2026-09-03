import { z } from "zod";
import { SystemToolExecutor, type ToolExecutionContext } from "./tools/executor.ts";
import {
  SYSTEM_TOOL_DEFINITIONS,
  TOOL_ARGUMENT_SCHEMAS,
  isToolName,
  type ToolName,
} from "./tools/schema.ts";

export interface ToolCallAction {
  tool: string;
  payload: unknown;
}

export type AutonomousTaskResult =
  | {
      status: "SUCCESS";
      executedTool: ToolName;
      data: unknown;
    }
  | {
      status: "UNAUTHORIZED_TOOL";
      error: string;
    }
  | {
      status: "INVALID_ARGUMENTS";
      executedTool: ToolName;
      error: string;
      issues: Array<{ path: string; message: string }>;
    }
  | {
      status: "EXECUTION_ERROR";
      executedTool: ToolName;
      error: string;
    };

function formatZodIssues(error: z.ZodError): Array<{ path: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

/**
 * Executes an already-selected LLM tool call after registry authorization and
 * deterministic runtime validation. Model/tool selection itself lives outside
 * this function; this boundary prevents an arbitrary model string from becoming
 * executable code.
 */
export async function runAutonomousTask(
  action: ToolCallAction,
  context: ToolExecutionContext = {},
): Promise<AutonomousTaskResult> {
  if (!isToolName(action.tool)) {
    return {
      status: "UNAUTHORIZED_TOOL",
      error: `Tool ${action.tool} tidak terdaftar dalam registry.`,
    };
  }

  const toolName = action.tool;
  const toolSpec = SYSTEM_TOOL_DEFINITIONS.find((definition) => definition.name === toolName);
  if (!toolSpec) {
    return {
      status: "UNAUTHORIZED_TOOL",
      error: `Tool ${toolName} tidak memiliki definisi eksekusi aktif.`,
    };
  }

  const schema = TOOL_ARGUMENT_SCHEMAS[toolName];
  const validation = schema.safeParse(action.payload);
  if (!validation.success) {
    return {
      status: "INVALID_ARGUMENTS",
      executedTool: toolName,
      error: "Payload tool tidak memenuhi runtime contract.",
      issues: formatZodIssues(validation.error),
    };
  }

  try {
    const executionResult = await SystemToolExecutor.execute(
      toolName,
      validation.data as Record<string, unknown>,
      context,
    );

    return {
      status: "SUCCESS",
      executedTool: toolName,
      data: executionResult,
    };
  } catch {
    // Never expose exception messages, stack traces, provider diagnostics, paths,
    // tokens, or upstream response bodies to the caller. Detailed diagnostics
    // belong in controlled server-side observability, not the public tool result.
    return {
      status: "EXECUTION_ERROR",
      executedTool: toolName,
      error: "Tool execution failed.",
    };
  }
}
