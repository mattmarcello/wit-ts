export type Filter<
  items extends readonly unknown[],
  item,
  ///
  acc extends readonly unknown[] = [],
> = items extends readonly [
  infer head,
  ...infer tail extends readonly unknown[],
]
  ? [head] extends [item]
    ? Filter<tail, item, acc>
    : Filter<tail, item, [...acc, head]>
  : readonly [...acc];

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type Trim<type, chars extends string = " "> = TrimLeft<
  TrimRight<type, chars>,
  chars
>;
type TrimLeft<t, chars extends string = " "> = t extends `${chars}${infer tail}`
  ? TrimLeft<tail>
  : t;
type TrimRight<
  t,
  chars extends string = " ",
> = t extends `${infer head}${chars}` ? TrimRight<head> : t;

export type OneOf<
  union extends object,
  ///
  allKeys extends KeyofUnion<union> = KeyofUnion<union>,
> = union extends infer item
  ? Prettify<item & { [key in Exclude<allKeys, keyof item>]?: never }>
  : never;
type KeyofUnion<type> = type extends type ? keyof type : never;

export type IsNever<T> = [T] extends [never] ? true : false;

export type IsNarrowable<T, U> =
  IsNever<
    (T extends U ? true : false) & (U extends T ? false : true)
  > extends true
    ? false
    : true;

export type Merge<object1, object2> = Omit<object1, keyof object2> & object2;

export type UnionEvaluate<type> = type extends object ? Prettify<type> : type;

export type UnionToTuple<
  union,
  ///
  last = LastInUnion<union>,
> = [union] extends [never]
  ? []
  : [...UnionToTuple<Exclude<union, last>>, last];
type LastInUnion<U> =
  UnionToIntersection<U extends unknown ? (x: U) => 0 : never> extends (
    x: infer l,
  ) => 0
    ? l
    : never;
type UnionToIntersection<union> = (
  union extends unknown ? (arg: union) => 0 : never
) extends (arg: infer i) => 0
  ? i
  : never;

export type IsUnion<
  union,
  ///
  union2 = union,
> = union extends union2 ? ([union2] extends [union] ? false : true) : never;

export type UnionOmit<type, keys extends keyof type> = type extends any
  ? Omit<type, keys>
  : never;

export type Assign<T, U> = Assign_<T, U> & U;
type Assign_<T, U> = {
  [K in keyof T as K extends keyof U
    ? U[K] extends void
      ? never
      : K
    : K]: K extends keyof U ? U[K] : T[K];
};

export type ExactPartial<type> = {
  [key in keyof type]?: type[key] | undefined;
};

export type Join<
  items extends readonly string[],
  separator extends string = ", ",
  ///
  acc extends string = "",
> = items extends readonly [
  infer head extends string,
  ...infer tail extends readonly string[],
]
  ? Join<tail, separator, acc extends "" ? head : `${acc}${separator}${head}`>
  : acc;
