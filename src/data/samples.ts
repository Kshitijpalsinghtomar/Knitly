/**
 * Real sample transcripts for the ingest → BRD flow.
 *
 * These are genuine, messy human-signal inputs (not synthetic marketing copy)
 * used both by the "Try a sample" affordance in the generate dialog and by the
 * offline validation script (`scripts/validate-transcript.ts`). Keeping them in
 * one module means the app and the tests exercise the exact same bytes.
 *
 * `checkout` is a product kickoff with a deliberate contradiction (one-click buy
 * vs. step-up auth) — it demonstrates conflict detection gating completeness.
 * `county-commission` is a real Robert's-Rules county-commission meeting
 * transcript (CTAS-2191, ctas.tennessee.edu) — an arbitrary real-world meeting
 * that is NOT a product spec, used to prove the pipeline degrades gracefully:
 * speaker attribution, requirement extraction and source-quote traceability all
 * still hold on input the tool was never tuned for.
 */
export interface SampleTranscript {
  id: string
  title: string
  brief: string
  /** One-line hint shown on the sample chip. */
  hint: string
  text: string
}

const CHECKOUT = `Katrina: We need to cut checkout abandonment by 30% this quarter.
James: The gateway must support payments in 14 currencies with real-time rates.
Omar: Checkout should complete in three steps max from cart to confirmation.
Katrina: Returning customers must have one-click buy with saved payment methods.
James: I disagree — one-click must not skip the step-up auth on orders over $500.
Omar: Fraud detection must flag suspicious transactions before authorisation.
Katrina: Payment API calls must stay under 800ms at the 99th percentile.
James: All payment data must be PCI DSS Level 1 compliant.
Omar: The checkout UI must be WCAG 2.1 AA accessible.
Katrina: We must not charge users for payment method storage.`

// Verbatim dialogue from the CTAS "Sample Meeting Transcript" (Reference
// CTAS-2191). Procedural noise ("So moved.", "Seconded") is intentionally left
// in — the generator's own length/filler filter is what should drop it, and the
// sample proves that it does.
const COUNTY_COMMISSION = `Chairman Wormsley: This meeting of the CTAS County Commission will come to order. Clerk please call the role.
Chairman Wormsley: Each of you has received the agenda. I will entertain a motion that the agenda be approved.
Commissioner Brown: So moved.
Commissioner Hobbs: Seconded.
Chairman Wormsley: It has been moved and seconded that the agenda be approved as received by the members. The agenda is approved.
Commissioner McCroskey: Mister Chairman, my name has been omitted from the Special Committee on Indigent Care.
Chairman Wormsley: If there are no objections, the minutes will be corrected to include the name of Commissioner McCroskey.
Commissioner Adkins: I would like to make a motion to approve the resolution taking money from the Data Processing Reserve Account in the County Clerk's office and moving it to the equipment line to purchase a laptop computer.
Commissioner Carmical: I second the motion.
Chairman Wormsley: This resolution has a motion and second. Will the clerk please take the vote.
Chairman Wormsley: The resolution passes. We will now take up old business.
Commissioner McKee: I move to withdraw that motion.
Commissioner Rodgers: I move adoption of the resolution previously provided to each of you to increase the state match local litigation tax in circuit, chancery, and criminal courts to the maximum amounts permissible. This resolution calls for the increases to go to the general fund.
Commissioner Duckett: The sheriff is opposed to this increase.
Commissioner Reinhart: For purposes of discussion, I second the motion.
Commissioner Duckett: I move an amendment to the motion to require 25 percent of the proceeds from the increase in the tax on criminal cases go to fund the sheriff's department.
Commissioner Malone: I second the amendment.
Commissioner Headrick: Does this require a two-thirds vote?
County Attorney Fults: Since these are only courts of record, a majority vote will pass it. The two-thirds requirement is for the general sessions taxes.
Commissioner Adams: Move for a roll call vote.
Commissioner Crenshaw: Second.
Commissioner Adkins: Each of you has previously received a copy of a resolution to increase the wheel tax by $10 to make up the state cut in education funding. I move adoption of this resolution.
Commissioner Thompson: I second.
Commissioner Hayes: I move previous question.
Commissioner Crenshaw: Second.
Commissioner Hailey: There will be a meeting of the Budget Committee to look at solid waste funding recommendations on Tuesday, July 16 at noon here in this room.
Commissioner Carmical: There will be a chili supper at County Elementary School on August 16 at 6:30 p.m. Everyone is invited.
Commissioner Austin: Move adjournment.
Commissioner Garland: Second.
Chairman Wormsley: Without objection, the meeting will stand adjourned.`

export const SAMPLE_TRANSCRIPTS: SampleTranscript[] = [
  {
    id: 'checkout',
    title: 'Checkout overhaul — kickoff sync',
    brief: 'A BRD for overhauling the checkout experience — reduce cart abandonment and support multi-currency payments.',
    hint: 'Product kickoff · has a real conflict',
    text: CHECKOUT,
  },
  {
    id: 'county-commission',
    title: 'CTAS County Commission — regular meeting',
    brief: 'Requirements captured from a county commission meeting run under Robert’s Rules of Order.',
    hint: 'Real meeting transcript (CTAS-2191)',
    text: COUNTY_COMMISSION,
  },
]

/** The default sample (kept for the existing single-button affordance). */
export const SAMPLE_TRANSCRIPT = CHECKOUT
