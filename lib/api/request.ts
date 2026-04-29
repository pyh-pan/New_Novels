import { z } from "zod";

export async function parseJsonRequest<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
): Promise<z.SafeParseReturnType<unknown, z.infer<T>>> {
  try {
    return schema.safeParse(await request.json());
  } catch {
    return {
      success: false,
      error: new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          path: [],
          message: "Invalid JSON"
        }
      ])
    };
  }
}
