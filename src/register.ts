// biome-ignore lint/suspicious/noEmptyInterface: <explanation>
export interface Register {}

export type ResolvedRegister = {
  strictWitType: Register extends {
    strictWitType: infer type extends boolean;
  }
    ? type
    : Register extends { StrictWitType: infer type extends boolean }
      ? type
      : DefaultRegister["strictWitType"];

  bigIntType: Register extends { bigIntType: infer type }
    ? type
    : Register extends { BigIntType: infer type }
      ? type
      : DefaultRegister["bigIntType"];

  intType: Register extends { intType: infer type }
    ? type
    : Register extends { IntType: infer type }
      ? type
      : DefaultRegister["intType"];
};

export type DefaultRegister = {
  strictWitType: false;
  intType: number;
  bigIntType: bigint;
};
