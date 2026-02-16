import type { OneOf, Prettify } from "./type-utils.js";

type BaseErrorArgs = Prettify<
  {
    docsPath?: string | undefined;
    metaMessages?: string[] | undefined;
  } & OneOf<{ details?: string | undefined } | { cause?: BaseError | Error }>
>;

export class BaseError extends Error {
  details: string;
  docsPath?: string | undefined;
  metaMessages?: string[] | undefined;
  shortMessage: string;

  override name = "WitTypeError";

  constructor(shortMessage: string, args: BaseErrorArgs = {}) {
    const details =
      args.cause instanceof BaseError
        ? args.cause.details
        : args.cause?.message
          ? args.cause.message
          : args.details!;
    const docsPath =
      args.cause instanceof BaseError
        ? args.cause.docsPath || args.docsPath
        : args.docsPath;
    const message = [
      shortMessage || "An error occurred.",
      "",
      ...(args.metaMessages ? [...args.metaMessages, ""] : []),
      ...(docsPath ? [`Docs: TODO: add docs path`] : []),
      ...(details ? [`Details: ${details}`] : []),
    ].join("\n");

    super(message);

    if (args.cause) this.cause = args.cause;
    this.details = details;
    this.docsPath = docsPath;
    this.metaMessages = args.metaMessages;
    this.shortMessage = shortMessage;
  }
}

export type Error_<messages extends string | string[]> = messages extends string
  ? [
      // Surrounding with array to prevent `messages` from being widened to `string`
      `Error: ${messages}`,
    ]
  : {
      [key in keyof messages]: messages[key] extends infer message extends
        string
        ? `Error: ${message}`
        : never;
    };
