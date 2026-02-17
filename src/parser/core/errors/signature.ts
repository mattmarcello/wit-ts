import { BaseError } from "../../../error.js";
import type { WitItemType } from "../../../wit.js";

export class InvalidSignatureError extends BaseError {
  override name = "InvalidSignatureError";

  constructor({
    signature,
    type,
  }: {
    signature: string;
    type: WitItemType | "record" | "variant" | "enum" | "flags";
  }) {
    super(`Invalid ${type} signature.`, {
      details: signature,
    });
  }
}

export class UnknownSignatureError extends BaseError {
  override name = "UnknownSignatureError";

  constructor({ signature }: { signature: string }) {
    super("Unknown signature.", {
      details: signature,
    });
  }
}

export class InvalidRecordSignatureError extends BaseError {
  override name = "InvalidRecordSignatureError";

  constructor({ signature }: { signature: string }) {
    super("Invalid record signature.", {
      details: signature,
      metaMessages: ["No properties exist."],
    });
  }
}
