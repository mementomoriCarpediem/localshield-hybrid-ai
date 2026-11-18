/**
 * Sample documents for one-click demos.
 *
 * Every person, company, identifier and amount below is fictional. The point is
 * that the documents are *packed* with the kind of data that must never reach a
 * third-party model: names, SSN/EIN, passport, bank details, salary, addresses.
 */

export interface SampleDoc {
  id: string;
  title: string;
  subtitle: string;
  text: string;
}

export const SAMPLES: SampleDoc[] = [
  {
    id: "freelance",
    title: "Freelance Service Agreement",
    subtitle: "Design retainer · Net 60 · non-compete",
    text: `FREELANCE SERVICE AGREEMENT

This Freelance Service Agreement ("Agreement") is entered into as of March 4, 2026 (the "Effective Date") by and between Northwind Studio LLC, a Delaware limited liability company with its principal place of business at 2210 Harbor Point Ave, Suite 300, San Francisco, CA 94107 ("Client"), and Sarah J. Whitfield, an individual residing at 1420 Cypress Grove Blvd, Apt 6B, Oakland, CA 94610 ("Contractor").

1. SERVICES. Contractor will provide brand identity, design system and front-end implementation services for the Client's patient portal relaunch, as described in Exhibit A. Contractor will make herself available for up to 40 hours per week during the Term.

2. COMPENSATION. Client will pay Contractor a fixed fee of $18,500.00 per month, invoiced on the first business day of each month. Payment is due Net 60 from receipt of invoice. Any amount not paid when due shall accrue interest at 1.5% per month. Contractor may suspend all work if any invoice remains unpaid for more than 45 days.

3. EXPENSES. Client will reimburse pre-approved expenses. Any single expense above $2,000 requires written approval from the Client's Head of Marketing before it is incurred.

4. INTELLECTUAL PROPERTY. Contractor hereby assigns to Client all right, title and interest in and to the deliverables, including all derivative works. Contractor retains ownership of tools, libraries and methods developed before the Effective Date and incorporated into the deliverables ("Background IP"), and grants Client a perpetual, worldwide, non-exclusive license to use the Background IP.

5. CONFIDENTIALITY. Contractor shall hold in confidence all non-public information of Client, including patient data, and shall not disclose it to any third party. This obligation survives for five (5) years after termination.

6. NON-COMPETE. During the Term and for twelve (12) months following termination, Contractor shall not directly or indirectly provide substantially similar services to any dental practice, dental support organization or healthcare marketing agency operating in the United States.

7. INDEMNIFICATION. Contractor shall indemnify, defend and hold harmless Client from any and all claims arising out of Contractor's performance, without limitation as to amount, and shall maintain professional liability insurance of not less than $1,000,000 per occurrence.

8. TERMINATION. Client may terminate this Agreement for convenience upon seven (7) days' written notice. Contractor may terminate only for Client's material breach that remains uncured for thirty (30) days after notice. On termination, Client shall pay for work performed through the termination date, but not for work in progress.

9. GOVERNING LAW. This Agreement is governed by the laws of the State of Delaware, excluding its conflict of laws rules. The parties consent to exclusive jurisdiction of the state and federal courts located in Wilmington, Delaware.

10. NOTICES AND TAX REPORTING. Contractor's taxpayer identification number is SSN 412-87-3391; Client's EIN is 87-4410293. Remittance details: Account No. 8827-4410-39, Routing 121000248, First Meridian Bank. Notices to Contractor: s.whitfield@brightpath-dental.com or +1 (415) 555-0182. Notices to Client: legal@northwindstudio.com.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date.

Name: Sarah J. Whitfield
Name: Daniel Okafor, COO, Northwind Studio LLC`,
  },
  {
    id: "nda",
    title: "Mutual NDA",
    subtitle: "One-way residual clause · 5-year term",
    text: `MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement (this "NDA") is made effective as of January 12, 2026, by and between Brightpath Dental Group Inc., a California corporation located at 900 Mission Bay Blvd, San Francisco, CA 94158 ("Disclosing Party"), and Helio Labs Inc., a Delaware corporation located at 44 Foundry Street, Boston, MA 02109 ("Receiving Party").

1. PURPOSE. The parties wish to explore a potential commercial partnership relating to scheduling automation for dental clinics (the "Purpose").

2. CONFIDENTIAL INFORMATION. "Confidential Information" means any non-public information disclosed by either party, whether oral, written or electronic, including product roadmaps, pricing, patient workflow data, source code, customer lists and financial information. Confidential Information does not include information that is or becomes publicly available without breach, was known to the Receiving Party before disclosure, or is independently developed without use of the Confidential Information.

3. OBLIGATIONS. The Receiving Party shall use Confidential Information solely for the Purpose, shall protect it with at least the same degree of care it uses for its own confidential information (and in no event less than reasonable care), and shall limit access to employees and contractors with a need to know who are bound by written obligations at least as protective as this NDA.

4. RESIDUALS. Notwithstanding Section 3, the Receiving Party may use for any purpose the general knowledge, skills, ideas and techniques retained in the unaided memory of its personnel who have had access to Confidential Information ("Residuals"), provided that this section does not grant any license under either party's patents or copyrights. The Disclosing Party acknowledges that the Receiving Party develops products independently and that no obligation exists to account for Residuals.

5. TERM. This NDA remains in effect for five (5) years from the Effective Date. The confidentiality obligations survive for three (3) years after termination, except for trade secrets, which remain protected for as long as they qualify as trade secrets.

6. NO LICENSE. Nothing in this NDA grants any right, title or interest in or to the Confidential Information, except the limited right to use it for the Purpose.

7. REMEDIES. The parties acknowledge that monetary damages may be inadequate and that the Disclosing Party is entitled to seek injunctive relief without posting bond, in addition to any other remedy available at law or in equity.

8. RETURN OF MATERIALS. Upon written request, the Receiving Party shall return or destroy all Confidential Information within ten (10) business days and certify destruction in writing, except for one archival copy retained by legal counsel.

9. GOVERNING LAW AND VENUE. This NDA is governed by the laws of the State of California. The parties irrevocably submit to the exclusive jurisdiction of the state and federal courts sitting in San Francisco County.

10. NOTICES. Notices shall be sent to: Brightpath Dental Group Inc., Attn: Dr. Amelia R. Vance, 900 Mission Bay Blvd, San Francisco, CA 94158, avance@brightpath-dental.com, +1 (415) 555-0147; and Helio Labs Inc., Attn: Marcus T. Alvarez, 44 Foundry Street, Boston, MA 02109, m.alvarez@heliolabs.io, +1 (617) 555-0139.

IN WITNESS WHEREOF, the parties have executed this NDA by their duly authorized representatives.

Signed by: Amelia R. Vance
Signed by: Marcus T. Alvarez`,
  },
  {
    id: "offer",
    title: "Employment Offer Letter",
    subtitle: "At-will · 18-month non-compete · arbitration",
    text: `EMPLOYMENT OFFER LETTER

February 2, 2026

Dear Marcus T. Alvarez,

On behalf of Helio Labs Inc., we are pleased to offer you the position of Principal Product Designer, reporting to the Chief Product Officer. Your start date will be March 16, 2026. This letter sets out the terms of your employment.

1. COMPENSATION. Your annual base salary will be $145,000.00, paid semi-monthly in accordance with the Company's payroll schedule. You are also eligible for an annual performance bonus with a target of 15% of base salary, determined at the sole discretion of the Company.

2. SIGNING BONUS. You will receive a signing bonus of $15,000.00, payable within 30 days of your start date. If you resign without Good Reason or are terminated for Cause within twelve (12) months, you must repay the full gross amount of the signing bonus.

3. EQUITY. Subject to approval by the Board of Directors, you will be granted 12,000 restricted stock units. The RSUs vest over four (4) years, with 25% vesting on the first anniversary of your start date and the remainder vesting quarterly thereafter, subject to your continued employment. The Company may repurchase unvested shares at cost upon termination for any reason.

4. BENEFITS. You will be eligible for the Company's health, dental and vision plans, a 401(k) plan with a 3% match, and 15 days of paid time off per year. Unlimited sick leave applies.

5. AT-WILL EMPLOYMENT. Your employment is at-will. Either you or the Company may terminate the employment relationship at any time, with or without cause or notice. Nothing in this letter creates a contract of employment for a fixed term.

6. NON-COMPETE AND NON-SOLICITATION. For eighteen (18) months following the end of your employment, you shall not, anywhere in North America, directly or indirectly engage in, own, manage, or provide services to any business that competes with the Company's scheduling automation products. For twenty-four (24) months you shall not solicit any employee or customer of the Company.

7. INTELLECTUAL PROPERTY. You assign to the Company all inventions, designs and works of authorship created during your employment that relate to the Company's business, including those created outside working hours. You waive any moral rights in such works.

8. ARBITRATION. Any dispute arising out of or relating to your employment shall be resolved exclusively by binding arbitration before a single arbitrator, and you waive any right to participate in a class action or collective proceeding. The Company will pay the arbitrator's fees.

9. BACKGROUND AND ELIGIBILITY. This offer is contingent on satisfactory completion of a background check and verification of your eligibility to work in the United States. For onboarding, please provide your Social Security number (SSN 527-19-8046), date of birth (DOB: July 9, 1988), passport number E12345678, home address (77 Alder Crest Road, Unit 4, Cambridge, MA 02139), and direct deposit instructions (Account No. 3310-7782-15, Routing 011000015).

10. ENTIRE AGREEMENT. This letter, together with the Company's standard confidentiality and invention assignment agreement, constitutes the entire agreement between you and the Company regarding its subject matter and supersedes all prior understandings.

We are excited about the possibility of you joining us. Please sign and return this letter by February 16, 2026.

Sincerely,
Name: Daniel Okafor
Chief People Officer, Helio Labs Inc.
d.okafor@heliolabs.io · +1 (617) 555-0164

Accepted and agreed:

Name: Marcus T. Alvarez
Date: February 10, 2026`,
  },
];
