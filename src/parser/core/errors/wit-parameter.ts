import { BaseError } from "../../../error.js";

export class InvalidWitParameterError extends BaseError {
  override name = "InvalidWitParameterError";

  constructor({ param }: { param: string | object }) {
    super("Failed to parse Wit parameter.", {
      details: `parseWitParameter(${JSON.stringify(param, null, 2)})`,
    });
  }
}
export class WitProtectedKeywordError extends BaseError {
  override name = "WitProtectedKeywordError";

  constructor({ param, name }: { param: string; name: string }) {
    super("Invalid Wit parameter.", {
      details: param,
      metaMessages: [`"${name}" is a protected Wit keyword`],
    });
  }
}
