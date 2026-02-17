# wit-ts

A standalone [WIT](https://component-model.bytecodealliance.org/design/wit.html) (WebAssembly Interface Types) parser and formatter for TypeScript with both runtime and type-level capabilities. Zero runtime dependencies.

Inspired by [abitype](https://github.com/wevm/abitype).

## Install

```bash
pnpm add wit-ts
```

## Overview

wit-ts provides **dual parsing** — every parser has a runtime implementation and a type-level counterpart using template literal types. Parse WIT signatures into structured objects, format them back to strings, and extract TypeScript types from them.

### Example: typed API client from WIT strings

Define your interface as plain strings — get a fully typed client with zero codegen:

```ts
import type {
  ParseWit,
  ExtractWitFunctions,
  WitParameterToPrimitiveType,
  WitParametersToPrimitiveTypes,
  Wit,
} from "wit-ts";

// 1. Define WIT signatures as string literals
const wit = [
  "record user { name: string, age: u32 }",
  "record post { title: string, body: string }",
  "get-user: func(id: u64) -> user;",
  "create-post: func(author: user, post: post) -> result<post, error>;",
  "list-posts: func(limit: u32) -> list<post>;",
] as const;

// 2. Derive a typed client interface — no codegen, pure types
type WitClient<wit extends Wit> = {
  [fn in ExtractWitFunctions<wit> as fn["name"]]: (
    ...args: WitParametersToPrimitiveTypes<fn["inputs"]>
  ) => Promise<WitParameterToPrimitiveType<fn["outputs"][0]>>;
};

type MyClient = WitClient<ParseWit<typeof wit>>;
//   ^? {
//        "get-user":    (id: bigint) => Promise<{ name: string; age: number }>;
//        "create-post": (author: { name: string; age: number }, post: { ... }) => Promise<["ok", { title: string; body: string }] | ["err", ...]>;
//        "list-posts":  (limit: number) => Promise<readonly { title: string; body: string }[]>;
//      }
```

Change a WIT string, and every call site updates — the same idea as [abitype](https://github.com/wevm/abitype) for Ethereum ABIs, applied to WebAssembly interfaces.

## Parse

### `parseWit`

Parse an array of WIT signatures into structured `WitFunction` objects. Records, variants, and enums are resolved via two-pass type resolution.

```ts
import { parseWit } from "wit-ts";

const wit = parseWit([
  "record point { x: s32, y: s32 }",
  "enum color { red, green, blue }",
  "draw: func(p: point, c: color) -> bool;",
]);
// [
//   {
//     name: "draw",
//     type: "function",
//     inputs: [
//       {
//         name: "p",
//         type: "record",
//         internalType: "point",
//         components: [
//           { name: "x", type: "s32", internalType: "s32" },
//           { name: "y", type: "s32", internalType: "s32" },
//         ],
//       },
//       {
//         name: "c",
//         type: "enum",
//         internalType: "color",
//         components: [
//           { name: "red", type: "_" },
//           { name: "green", type: "_" },
//           { name: "blue", type: "_" },
//         ],
//       },
//     ],
//     outputs: [
//       { type: "bool", internalType: "bool" },
//     ],
//   },
// ]
```

The return type is fully inferred — no casts, no generics.

### `parseWitParameter`

Parse a single WIT parameter. Accepts a string or an array of strings (with type definitions).

```ts
import { parseWitParameter } from "wit-ts";

const param = parseWitParameter("x: u64");
// { name: "x", type: "u64", internalType: "u64" }
```

With user-defined types:

```ts
const param = parseWitParameter([
  "record point { x: s32, y: s32 }",
  "p: option<point>",
]);
// {
//   name: "p",
//   type: "option<record>",
//   internalType: "option<point>",
//   components: [
//     { name: "x", type: "s32", internalType: "s32" },
//     { name: "y", type: "s32", internalType: "s32" },
//   ],
// }
```

## Format

The reverse of parsing — takes structured objects and produces WIT strings.

### `formatWit`

Format an array of `WitFunction` objects back to WIT signature strings. Collects type definitions (records, variants, enums) and emits them before function signatures, with deduplication and depth-first ordering.

```ts
import { parseWit, formatWit } from "wit-ts";

const wit = parseWit([
  "record point { x: s32, y: s32 }",
  "draw: func(p: point) -> bool;",
]);

formatWit(wit);
// [
//   "record point { x: s32, y: s32 }",
//   "draw: func(p: point) -> bool;",
// ]
```

Round-trips cleanly:

```ts
const sigs = [
  "record aa { a: u32, b: u32 }",
  "f: func(a: aa) -> result<aa, error>;",
] as const;

parseWit(formatWit(parseWit(sigs)));
// equals parseWit(sigs)
```

### `formatWitFunction`

Format a single `WitFunction` to its signature string.

```ts
import { formatWitFunction } from "wit-ts";

formatWitFunction({
  name: "add",
  type: "function",
  inputs: [
    { name: "a", type: "u64", internalType: "u64" },
    { name: "b", type: "u64", internalType: "u64" },
  ],
  outputs: [
    { type: "u64", internalType: "u64" },
  ],
});
// "add: func(a: u64, b: u64) -> u64;"
```

### `formatWitParameter`

Format a single `WitParameter` to its inline signature.

```ts
import { formatWitParameter } from "wit-ts";

formatWitParameter({
  name: "x",
  type: "record",
  internalType: "point",
  components: [...],
});
// "x: point"
```

## Type-level

Every runtime function has a type-level counterpart:

```ts
import type {
  ParseWit,
  ParseWitParameter,
  FormatWit,
  FormatWitFunction,
  FormatWitParameter,
} from "wit-ts";

type Wit = ParseWit<
  readonly [
    "record aa { a: u32, b: u32 }",
    "f: func(a: aa) -> u64;",
  ]
>;

type Formatted = FormatWit<Wit>;
// ["record aa { a: u32, b: u32 }", "f: func(a: aa) -> u64;"]

type Param = ParseWitParameter<"x: list<string>">;
// {
//   name: "x";
//   type: "list<string>";
//   internalType: "list<string>";
// }

type Sig = FormatWitFunction<Wit[0]>;
// "f: func(a: aa) -> u64;"
```

## Utilities

### Extract functions

```ts
import type {
  ExtractWitFunctions,
  ExtractWitFunctionNames,
  ExtractWitFunction,
} from "wit-ts";

type Fns = ExtractWitFunctions<typeof wit>;
type Names = ExtractWitFunctionNames<typeof wit>;
type Draw = ExtractWitFunction<typeof wit, "draw">;
```

### Map to primitive types

```ts
import type {
  WitParameterToPrimitiveType,
  WitParametersToPrimitiveTypes,
  WitTypeToPrimitiveType,
} from "wit-ts";

type T = WitTypeToPrimitiveType<"u64">;
// number | bigint (depends on Register)
```

### Register pattern

Override type mappings via module augmentation:

```ts
declare module "wit-ts" {
  interface Register {
    bigIntType: bigint;
    intType: number;
  }
}
```

## Supported WIT types

| Category | Types |
|---|---|
| **Boolean** | `bool` |
| **Integers** | `u8`, `u16`, `u32`, `u64`, `s8`, `s16`, `s32`, `s64` |
| **String** | `string` |
| **Generics** | `list<T>`, `option<T>`, `result<T, error>` |
| **User-defined** | `record`, `variant`, `enum`, `flags` |

### Function signatures

```wit
name: func(param: type) -> return-type;
export name: func() -> list<u64>;
no-return: func(x: u64);
```

### User-defined types

```wit
record address { street: string, city: string }
variant shape { circle(f64), rect(dimensions) }
enum status { pending, active, done }
flags permissions { read, write, exec }
```

## License

MIT
