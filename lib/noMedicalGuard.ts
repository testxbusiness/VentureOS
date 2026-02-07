export type GuardCheckResult = {
  isAllowed: boolean;
  blockedMatches: string[];
};

export function runNoMedicalCheck(text: string, blockedTerms: string[]): GuardCheckResult {
  const lower = text.toLowerCase();
  const blockedMatches = blockedTerms.filter((term) => lower.includes(term.toLowerCase()));
  return {
    isAllowed: blockedMatches.length === 0,
    blockedMatches
  };
}
