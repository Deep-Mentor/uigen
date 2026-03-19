Run a security audit on all npm dependencies and fix any vulnerabilities found.

## Steps

1. Run `npm audit` to list all vulnerabilities with their severity and affected packages
2. Analyse the output — group findings by severity (critical, high, moderate, low)
3. Run `npm audit fix` to automatically fix vulnerabilities that have a non-breaking semver-compatible upgrade
4. If critical or high vulnerabilities remain after the auto-fix, run `npm audit fix --force` only after confirming with the user — it may introduce breaking changes
5. Re-run `npm audit` to verify the final state and report what was fixed vs what still needs manual attention

## Report format

After completing, summarise:
- Total vulnerabilities before and after
- Packages updated and to which version
- Any remaining vulnerabilities that could not be auto-fixed and why
