import type { Wit, WitFunction } from "../wit.js";
import {
  formatFunctionSignature,
  collectTypeDefinitions,
} from "./core/utils.js";
import type {
  FormatFunctionSignature,
  CollectTypeDefinitions,
} from "./core/types/utils.js";

export type FormatWit<wit extends Wit> = [
  ...CollectAllTypeDefinitions<wit>,
  ...FormatAllFunctions<wit>,
];

type CollectAllTypeDefinitions<
  wit extends Wit,
  seen extends string = never,
> = wit extends readonly [
  infer head extends WitFunction,
  ...infer tail extends readonly WitFunction[],
]
  ? CollectTypeDefinitions<
      [...head["inputs"], ...head["outputs"]],
      seen
    > extends infer defs extends readonly string[]
    ? [...defs, ...CollectAllTypeDefinitions<tail, seen | defs[number]>]
    : CollectAllTypeDefinitions<tail, seen>
  : [];

type FormatAllFunctions<wit extends Wit> = {
  [K in keyof wit]: FormatFunctionSignature<wit[K]>;
} extends infer R extends readonly string[]
  ? R
  : never;

export function formatWit<const wit extends Wit>(
  wit: wit,
): FormatWit<wit> {
  const seen = new Set<string>();
  const typeDefs: string[] = [];

  for (const fn of wit) {
    const allParams = [...fn.inputs, ...fn.outputs];
    const defs = collectTypeDefinitions(allParams, seen);
    typeDefs.push(...defs);
  }

  const functionSigs = wit.map(formatFunctionSignature);

  return [...typeDefs, ...functionSigs] as FormatWit<wit>;
}
