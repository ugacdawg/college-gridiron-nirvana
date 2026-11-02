import { buildRivalries, protectedPairKeys } from "../selectors/rivalries";
import { dataset, workbook } from ".";

/** Rivalry catalog derived once per server process from the workbook locks + fixture search. */
export const rivalries = buildRivalries(dataset, workbook.rivalryLocks);
export const protectedKeys = protectedPairKeys(rivalries);
