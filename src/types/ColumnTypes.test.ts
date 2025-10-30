import { describe, expect, it } from "vitest";
import { Bit, Char, Decimal, Numeric, VarBit, Varchar } from "./ColumnTypes.js";

describe("Column Types", () => {
  it("should create Numeric column type", () => {
    const numericType = Numeric(10, 2);
    expect(numericType.build()).toEqual("NUMERIC(10, 2)");

    const numericTypeNoScale = Numeric(5);
    expect(numericTypeNoScale.build()).toEqual("NUMERIC(5)");
  });

  it('should create Decimal column type', () => {
    const decimalType = Decimal(8, 3);
    expect(decimalType.build()).toEqual("DECIMAL(8, 3)");

    const decimalTypeNoScale = Decimal(4);
    expect(decimalTypeNoScale.build()).toEqual("DECIMAL(4)");
  });

  it('should create Char column type', () => {
    const charType = Char(10);
    expect(charType.build()).toEqual("CHAR(10)");
  });

  it('should create Varchar column type', () => {
    const varcharType = Varchar(255);
    expect(varcharType.build()).toEqual("VARCHAR(255)");
  });

  it('should create Bit column type', () => {
    const bitType = Bit(1);
    expect(bitType.build()).toEqual("BIT(1)");
  });

  it('should create VarBit column type', () => {
    const varBitType = VarBit(16);
    expect(varBitType.build()).toEqual("VARBIT(16)");
  });
});
