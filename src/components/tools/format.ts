import { round } from "@/lib/calc";

/** A number with grouped thousands and a fixed number of decimals: 2345.6 becomes "2,346". */
export const fmt = (v: number, dp = 0) => {
  const fixed = round(v, dp).toFixed(dp);
  const [int, frac] = fixed.split(".");
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (frac ? `.${frac}` : "");
};
