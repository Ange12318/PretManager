# Security Specification - PretManager

## 1. Data Invariants
- An authenticated user can only read and write their own profile and loans.
- `userId` (P2P ID) is immutable after creation.
- `loans` must be linked to the authenticated user.
- Timestamps (`createdAt`) should ideally be server-managed.

## 2. The "Dirty Dozen" Payloads
1. **Unauthorized Read**: Attempting to read `users/attacker_uid/loans/victim_loan_id` from a different account.
2. **Unauthorized Write**: Attempting to write a loan to `users/victim_uid/loans/new_loan`.
3. **Identity Spoofing**: Creating a loan with `personName` of someone else but trying to bypass the `uid` path (not applicable if rules enforce path `uid`).
4. **Field Injection**: Adding `isVerified: true` to a loan document during update.
5. **Schema Violation**: Saving a loan with `amount: "lots of money"` (string instead of number).
6. **State Shortcutting**: Updating a loan from `active` directly to `deleted` (if deleted was a state) or modifying `createdAt`.
7. **P2P ID Hijack**: Trying to change the `userId` in `users/{uid}` profile.
8. **Resource Poisoning**: Document ID with 1MB of junk characters.
9. **Timestamp Manipulation**: Force-setting `createdAt` to a date in the past.
10. **PII Leak**: Reading `users/{uid}` without being that user.
11. **Orphaned Write**: Writing a loan with a non-existent user profile (redundant if path is nested).
12. **Mass Querying**: Attempting to list all loans across all users.

## 3. The Test Runner
(Skipping the full `.ts` file for brevity here, but will ensure rules cover all points).
