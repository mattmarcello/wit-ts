import { BaseError } from "../../../error.js";

export class InvalidGenericDepthError extends BaseError {
  override name = "InvalidGenericDepthError";

  constructor({ current, depth }: { current: string; depth: number }) {
    super("Unbalanced angle brackets.", {
      metaMessages: [
        `"${current.trim()}" has too many ${
          depth > 0 ? "opening" : "closing"
        } brackets.`,
      ],
      details: `Depth "${depth}"`,
    });
  }
}
