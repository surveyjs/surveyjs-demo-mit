import type { SchemaDefinition, SurveyJSON } from "./types";

export const insuranceClaimJson: SurveyJSON = {
  title: "Health Insurance Claim (CMS-1500)",
  description: "Create or edit a claim record, box by box as the paper form.",
  showQuestionNumbers: "off",
  widthMode: "responsive",
  questionErrorLocation: "bottom",
  aiHint:
    "The document is a CMS-1500 (02/12) Health Insurance Claim Form, the standard US professional claim. Every question below is named after the numbered box it comes from, and each box is labelled with that number on the form - read the value out of that box and nowhere else. Never carry a value over from a neighbouring box, and never repeat a value you have already used for a different question unless the form really prints it twice. Checkbox geometry matters and is not uniform: in boxes 3, 6 and 11a the little square sits to the RIGHT of the word it belongs to (so an X between 'Self' and 'Spouse' belongs to Self), while in boxes 10a-10c, 11d, 20 and 27 the square sits to the LEFT of its YES or NO label. Dates are printed as MM DD YY in three adjacent little boxes; return them as YYYY-MM-DD, reading a two-digit year 00-40 as 20xx and 41-99 as 19xx. Money is printed as dollars and cents in two adjacent columns with no decimal point, so '145 00' means 145.00. Diagnosis codes are printed with the decimal point left out: return the code with the point put back where the ICD-10 standard has it, so 'M5451' becomes M54.51 and 'E785' becomes E78.5. The left half of the form is about the patient and any secondary policy, the right half about the insured and the payer. When a box on the form is blank, or the question is not on the form at all, return null for it - not an empty string. Never invent a value.",
  pages: [
    {
      name: "record",
      title: "Record",
      elements: [
        {
          type: "panel",
          name: "recordMeta",
          title: "Record",
          description: "Internal to this app - not part of the paper form.",
          elements: [
            {
              type: "text",
              name: "claimNumber",
              title: "Claim number",
              isRequired: true,
              maskType: "pattern",
              maskSettings: { pattern: "CLM-9999-9999" },
              placeholder: "CLM-____-____",
              aiHint:
                "Not on the CMS-1500 form. This app assigns it, so return null.",
            },
            {
              type: "dropdown",
              name: "status",
              title: "Status",
              isRequired: true,
              startWithNewLine: false,
              defaultValue: "draft",
              choices: [
                { value: "draft", text: "Draft" },
                { value: "submitted", text: "Submitted" },
                { value: "in_review", text: "In review" },
                { value: "approved", text: "Approved" },
                { value: "denied", text: "Denied" },
              ],
              aiHint:
                "Not on the CMS-1500 form - it is this app's own workflow state. Return null.",
            },
          ],
        },
        {
          type: "panel",
          name: "carrier",
          title: "Box 1, 1a - Program and insured's ID",
          elements: [
            {
              type: "radiogroup",
              name: "insuranceProgram",
              title: "Box 1 - Insurance program",
              colCount: 4,
              choices: [
                { value: "medicare", text: "Medicare" },
                { value: "medicaid", text: "Medicaid" },
                { value: "tricare", text: "TRICARE" },
                { value: "champva", text: "CHAMPVA" },
                { value: "groupHealthPlan", text: "Group health plan" },
                { value: "fecaBlkLung", text: "FECA black lung" },
                { value: "other", text: "Other" },
              ],
              aiHint:
                "Box 1 is the row across the top of the form: seven program names printed on the upper line, and under each one a little square followed by its (ID#) note. The square belongs to the program name printed above it. Exactly one square carries an X; return that program. Do not answer other unless the X is under the word OTHER at the right-hand end of the row.",
            },
            {
              type: "text",
              name: "insuredIdNumber",
              title: "Box 1a - Insured's ID number",
              aiHint:
                "Box 1a, top right of the form, immediately right of the box 1 checkbox row. It is the member number the payer in box 11c issued, so its letter prefix often abbreviates that plan name.",
            },
          ],
        },
        {
          type: "panel",
          name: "patient",
          title: "Box 2, 3, 5, 6 - Patient",
          elements: [
            {
              type: "text",
              name: "patientLastName",
              title: "Last name",
              isRequired: true,
              aiHint:
                "Box 2 holds one line printed as 'Last, First Middle-Initial'. Return only the last name, without the comma.",
            },
            {
              type: "text",
              name: "patientFirstName",
              title: "First name",
              isRequired: true,
              startWithNewLine: false,
              aiHint: "Box 2, the part after the comma. First name only.",
            },
            {
              type: "text",
              name: "patientMiddleInitial",
              title: "MI",
              startWithNewLine: false,
              maxLength: 1,
              aiHint:
                "Box 2, the single letter after the first name. Empty if box 2 has no middle initial.",
            },
            {
              type: "text",
              name: "patientDob",
              title: "Box 3 - Date of birth",
              inputType: "date",
              aiHint:
                "Box 3, printed as MM DD YY in three small boxes. Return YYYY-MM-DD.",
            },
            {
              type: "radiogroup",
              name: "patientSex",
              title: "Box 3 - Sex",
              startWithNewLine: false,
              colCount: 2,
              choices: [
                { value: "M", text: "Male" },
                { value: "F", text: "Female" },
              ],
              aiHint:
                "Box 3, right of the birth date, under the word SEX: an M with its square to the right of it, then an F with its square to the right of it. The answer is the letter immediately to the LEFT of the marked square.",
            },
            {
              type: "text",
              name: "patientAddress",
              title: "Box 5 - Street address",
              aiHint: "Box 5, the first line only (number and street).",
            },
            {
              type: "text",
              name: "patientCity",
              title: "City",
              aiHint: "Box 5, the CITY field on the line below the street.",
            },
            {
              type: "text",
              name: "patientState",
              title: "State",
              startWithNewLine: false,
              maxLength: 2,
              aiHint: "Box 5, the two-letter STATE field right of the city.",
            },
            {
              type: "text",
              name: "patientZip",
              title: "ZIP",
              startWithNewLine: false,
              aiHint: "Box 5, the ZIP CODE field on the bottom line.",
            },
            {
              type: "text",
              name: "patientPhone",
              title: "Phone",
              startWithNewLine: false,
              aiHint:
                "Box 5, TELEPHONE. The area code sits inside the pre-printed parentheses; return the whole number as (999) 999-9999.",
            },
            {
              type: "radiogroup",
              name: "patientRelationshipToInsured",
              title: "Box 6 - Patient's relationship to insured",
              colCount: 4,
              choices: [
                { value: "self", text: "Self" },
                { value: "spouse", text: "Spouse" },
                { value: "child", text: "Child" },
                { value: "other", text: "Other" },
              ],
              aiHint:
                "Box 6, in the middle column: four words - Self, Spouse, Child, Other - each followed by its own square to its RIGHT. So an X standing between Self and Spouse is Self ticked, not Spouse; the answer is the word immediately to the LEFT of the marked square.",
            },
          ],
        },
        {
          type: "panel",
          name: "insured",
          title: "Box 4, 7, 11 - Insured",
          elements: [
            {
              type: "text",
              name: "insuredLastName",
              title: "Last name",
              aiHint:
                "Box 4, printed 'Last, First Middle-Initial'. Last name only. Often the same person as box 2.",
            },
            {
              type: "text",
              name: "insuredFirstName",
              title: "First name",
              startWithNewLine: false,
              aiHint: "Box 4, the part after the comma.",
            },
            {
              type: "text",
              name: "insuredMiddleInitial",
              title: "MI",
              startWithNewLine: false,
              maxLength: 1,
              aiHint: "Box 4, the single letter after the first name.",
            },
            {
              type: "text",
              name: "insuredAddress",
              title: "Box 7 - Street address",
              aiHint: "Box 7, first line (number and street).",
            },
            {
              type: "text",
              name: "insuredCity",
              title: "City",
              aiHint: "Box 7, CITY.",
            },
            {
              type: "text",
              name: "insuredState",
              title: "State",
              startWithNewLine: false,
              maxLength: 2,
              aiHint: "Box 7, STATE.",
            },
            {
              type: "text",
              name: "insuredZip",
              title: "ZIP",
              startWithNewLine: false,
              aiHint: "Box 7, ZIP CODE.",
            },
            {
              type: "text",
              name: "insuredPhone",
              title: "Phone",
              startWithNewLine: false,
              aiHint: "Box 7, TELEPHONE. Return as (999) 999-9999.",
            },
            {
              type: "text",
              name: "insuredPolicyGroup",
              title: "Box 11 - Policy group or FECA number",
              aiHint: "Box 11, right column, above the insured's date of birth.",
            },
            {
              type: "text",
              name: "insuredDob",
              title: "Box 11a - Insured's date of birth",
              inputType: "date",
              startWithNewLine: false,
              aiHint: "Box 11a, printed MM DD YY. Return YYYY-MM-DD.",
            },
            {
              type: "radiogroup",
              name: "insuredSex",
              title: "Box 11a - Sex",
              startWithNewLine: false,
              colCount: 2,
              choices: [
                { value: "M", text: "Male" },
                { value: "F", text: "Female" },
              ],
              aiHint:
                "Box 11a, right of the insured date of birth: an M with its square to the right of it, then an F with its square. The answer is the letter immediately to the LEFT of the marked square. It is the insured, so it need not match box 3.",
            },
            {
              type: "text",
              name: "otherClaimId",
              title: "Box 11b - Other claim ID",
              aiHint: "Box 11b, 'OTHER CLAIM ID (Designated by NUCC)'.",
            },
            {
              type: "text",
              name: "insurancePlanName",
              title: "Box 11c - Insurance plan or program name",
              aiHint: "Two boxes on this form carry the wording INSURANCE PLAN NAME OR PROGRAM NAME and they hold DIFFERENT insurers, so locate box 11c by the row it shares: it is the plan name printed at the RIGHT-HAND end of the row whose left-hand end reads c. OTHER ACCIDENT?. The other one, one row lower and at the LEFT-HAND end of the row that reads IS THERE ANOTHER HEALTH BENEFIT PLAN, is box 9d and must not be returned here. Box 11c is the payer this claim is addressed to - the carrier printed in the block at the very top of the form, which issued the member ID in box 1a.",
            },
            {
              type: "boolean",
              name: "anotherHealthBenefitPlan",
              title: "Box 11d - Another health benefit plan?",
              aiHint:
                "Box 11d, right column, the line that reads IS THERE ANOTHER HEALTH BENEFIT PLAN. Each square sits to the LEFT of its YES or NO label. true when the square before YES is marked, false when the square before NO is. Cross-check it: when boxes 9, 9a and 9d carry text the answer is true, and when that whole left-hand stack is blank the answer is false.",
            },
          ],
        },
        {
          type: "panel",
          name: "otherInsured",
          title: "Box 9 - Other insured",
          state: "collapsed",
          elements: [
            {
              type: "text",
              name: "otherInsuredName",
              title: "Box 9 - Other insured's name",
              aiHint:
                "Box 9, the top of the stack in the LEFT column, directly below box 2 and 5. It names the subscriber of a SECOND policy that also covers the patient, printed Last, First Middle-Initial. It is filled whenever box 11d says YES, and blank when 11d says NO.",
            },
            {
              type: "text",
              name: "otherInsuredPolicyGroup",
              title: "Box 9a - Other insured's policy or group number",
              aiHint: "Box 9a, in the LEFT column directly below box 9. The policy or group number of that second policy. Filled whenever box 9 has a name.",
            },
            {
              type: "text",
              name: "otherInsurancePlanName",
              title: "Box 9d - Insurance plan or program name",
              aiHint: "Two boxes on this form carry the wording INSURANCE PLAN NAME OR PROGRAM NAME and they hold DIFFERENT insurers, so locate box 9d by the row it shares: it is the plan name printed at the LEFT-HAND end of the row whose right-hand end reads IS THERE ANOTHER HEALTH BENEFIT PLAN with its YES and NO boxes. The other one, one row higher and at the RIGHT-HAND end of the row that begins c. OTHER ACCIDENT?, is box 11c and must not be returned here. Box 9d names the secondary policy from boxes 9 and 9a, never the payer this claim is sent to.",
            },
          ],
        },
        {
          type: "panel",
          name: "condition",
          title: "Box 10 - Is the patient's condition related to",
          elements: [
            {
              type: "boolean",
              name: "conditionEmployment",
              title: "Box 10a - Employment (current or previous)",
              aiHint:
                "Box 10a, middle column, the line EMPLOYMENT? (Current or Previous). Each square sits to the LEFT of its YES or NO label. true when the square before YES is marked.",
            },
            {
              type: "boolean",
              name: "conditionAutoAccident",
              title: "Box 10b - Auto accident",
              aiHint: "Box 10b, middle column, the line AUTO ACCIDENT?, directly below box 10a. Each square sits to the LEFT of its YES or NO label.",
            },
            {
              type: "text",
              name: "autoAccidentState",
              title: "Box 10b - Place (state)",
              visibleIf: "{conditionAutoAccident} = true",
              maxLength: 2,
              aiHint:
                "Box 10b, the small PLACE (State) field right of the auto-accident checkboxes.",
            },
            {
              type: "boolean",
              name: "conditionOtherAccident",
              title: "Box 10c - Other accident",
              aiHint: "Box 10c, middle column, the line OTHER ACCIDENT?, directly below box 10b. Each square sits to the LEFT of its YES or NO label.",
            },
            {
              type: "text",
              name: "claimCodes",
              title: "Box 10d - Claim codes",
              aiHint: "Box 10d, 'CLAIM CODES (Designated by NUCC)'.",
            },
          ],
        },
        {
          type: "panel",
          name: "signatures",
          title: "Box 12, 13 - Signatures",
          elements: [
            {
              type: "text",
              name: "patientSignature",
              title: "Box 12 - Patient's signature",
              aiHint:
                "Box 12, on the SIGNED line. Often printed as the words SIGNATURE ON FILE rather than a real signature - return the text as printed.",
            },
            {
              type: "text",
              name: "patientSignatureDate",
              title: "Box 12 - Date",
              inputType: "date",
              startWithNewLine: false,
              aiHint:
                "Box 12, the DATE beside the signature. Usually printed MM/DD/YYYY; return YYYY-MM-DD.",
            },
            {
              type: "text",
              name: "insuredSignature",
              title: "Box 13 - Insured's signature",
              aiHint: "Box 13, the SIGNED line in the right column.",
            },
          ],
        },
        {
          type: "panel",
          name: "dates",
          title: "Box 14-18 - Dates and referral",
          elements: [
            {
              type: "text",
              name: "currentIllnessDate",
              title: "Box 14 - Date of current illness, injury or pregnancy",
              inputType: "date",
              aiHint:
                "Box 14 is on the row that begins '14. DATE OF CURRENT ILLNESS, INJURY, or PREGNANCY (LMP)', immediately below the signature band in the left half of the form. It is the date the current problem started - never the patient's date of birth from box 3. Printed MM DD YY; return YYYY-MM-DD.",
            },
            {
              type: "text",
              name: "currentIllnessQual",
              title: "Box 14 - Qualifier",
              startWithNewLine: false,
              maxLength: 3,
              aiHint:
                "Box 14, the three-character QUAL code right of the date (431 = onset of current symptoms, 484 = last menstrual period).",
            },
            {
              type: "text",
              name: "otherDate",
              title: "Box 15 - Other date",
              inputType: "date",
              aiHint: "Box 15, printed MM DD YY. Return YYYY-MM-DD.",
            },
            {
              type: "text",
              name: "otherDateQual",
              title: "Box 15 - Qualifier",
              startWithNewLine: false,
              maxLength: 3,
              aiHint: "Box 15, the QUAL code left of the date.",
            },
            {
              type: "text",
              name: "unableToWorkFrom",
              title: "Box 16 - Unable to work from",
              inputType: "date",
              aiHint: "Box 16, the FROM date. Return YYYY-MM-DD.",
            },
            {
              type: "text",
              name: "unableToWorkTo",
              title: "Box 16 - to",
              inputType: "date",
              startWithNewLine: false,
              aiHint: "Box 16, the TO date. Return YYYY-MM-DD.",
            },
            {
              type: "text",
              name: "referringProviderName",
              title: "Box 17 - Referring provider",
              aiHint:
                "Box 17, the provider's name. Printed 'Last, First Middle-Initial' - return it as printed.",
            },
            {
              type: "text",
              name: "referringProviderQual",
              title: "Box 17 - Qualifier",
              startWithNewLine: false,
              maxLength: 2,
              aiHint:
                "Box 17, the two-letter qualifier in the small field left of the name (DN = referring, DK = ordering, DQ = supervising).",
            },
            {
              type: "text",
              name: "referringProviderNpi",
              title: "Box 17b - Referring provider NPI",
              startWithNewLine: false,
              aiHint: "Box 17b, the ten-digit NPI right of the NPI label.",
            },
            {
              type: "text",
              name: "hospitalizationFrom",
              title: "Box 18 - Hospitalized from",
              inputType: "date",
              aiHint: "Box 18, the FROM date. Return YYYY-MM-DD.",
            },
            {
              type: "text",
              name: "hospitalizationTo",
              title: "Box 18 - to",
              inputType: "date",
              startWithNewLine: false,
              aiHint: "Box 18, the TO date. Return YYYY-MM-DD.",
            },
          ],
        },
        {
          type: "panel",
          name: "diagnosis",
          title: "Box 19-23 - Diagnosis and authorization",
          elements: [
            {
              type: "comment",
              name: "additionalClaimInfo",
              title: "Box 19 - Additional claim information",
              rows: 2,
              aiHint: "Box 19, a single free-text line across the form.",
            },
            {
              type: "boolean",
              name: "outsideLab",
              title: "Box 20 - Outside lab?",
              aiHint: "Box 20, right column, the line OUTSIDE LAB?. Each square sits to the LEFT of its YES or NO label.",
            },
            {
              type: "text",
              name: "outsideLabCharges",
              title: "Box 20 - $ charges",
              inputType: "number",
              startWithNewLine: false,
              visibleIf: "{outsideLab} = true",
              aiHint:
                "Box 20, the $ CHARGES field right of the YES/NO boxes. Dollars and cents in adjacent columns; return a number such as 45.00, or null when the field is blank.",
            },
            {
              type: "text",
              name: "icdIndicator",
              title: "Box 21 - ICD indicator",
              maxLength: 1,
              aiHint:
                "Box 21, the single digit in the small ICD Ind. box (0 = ICD-10-CM, 9 = ICD-9-CM).",
            },
            {
              type: "text",
              name: "diagnosisA",
              title: "A",
              startWithNewLine: false,
              aiHint:
                "Box 21, the code on line A. Printed without a decimal point - return it exactly as printed.",
            },
            {
              type: "text",
              name: "diagnosisB",
              title: "B",
              startWithNewLine: false,
              aiHint: "Box 21, line B. Empty when the line is blank.",
            },
            {
              type: "text",
              name: "diagnosisC",
              title: "C",
              startWithNewLine: false,
              aiHint: "Box 21, line C.",
            },
            {
              type: "text",
              name: "diagnosisD",
              title: "D",
              startWithNewLine: false,
              aiHint: "Box 21, line D.",
            },
            {
              type: "panel",
              name: "diagnosisMore",
              title: "Box 21 - Diagnosis codes E-L",
              state: "collapsed",
              elements: [
                {
                  type: "text",
                  name: "diagnosisE",
                  title: "E",
                  aiHint: "Box 21, line E.",
                },
                {
                  type: "text",
                  name: "diagnosisF",
                  title: "F",
                  startWithNewLine: false,
                  aiHint: "Box 21, line F.",
                },
                {
                  type: "text",
                  name: "diagnosisG",
                  title: "G",
                  startWithNewLine: false,
                  aiHint: "Box 21, line G.",
                },
                {
                  type: "text",
                  name: "diagnosisH",
                  title: "H",
                  startWithNewLine: false,
                  aiHint: "Box 21, line H.",
                },
                {
                  type: "text",
                  name: "diagnosisI",
                  title: "I",
                  aiHint: "Box 21, line I.",
                },
                {
                  type: "text",
                  name: "diagnosisJ",
                  title: "J",
                  startWithNewLine: false,
                  aiHint: "Box 21, line J.",
                },
                {
                  type: "text",
                  name: "diagnosisK",
                  title: "K",
                  startWithNewLine: false,
                  aiHint: "Box 21, line K.",
                },
                {
                  type: "text",
                  name: "diagnosisL",
                  title: "L",
                  startWithNewLine: false,
                  aiHint: "Box 21, line L.",
                },
              ],
            },
            {
              type: "text",
              name: "resubmissionCode",
              title: "Box 22 - Resubmission code",
              aiHint: "Box 22, the code left of ORIGINAL REF. NO.",
            },
            {
              type: "text",
              name: "originalRefNo",
              title: "Box 22 - Original ref. no.",
              startWithNewLine: false,
              aiHint: "Box 22, the ORIGINAL REF. NO. field.",
            },
            {
              type: "text",
              name: "priorAuthorization",
              title: "Box 23 - Prior authorization number",
              startWithNewLine: false,
              aiHint: "Box 23, below box 22 in the right column.",
            },
          ],
        },
        {
          type: "panel",
          name: "services",
          title: "Box 24 - Services",
          elements: [
            {
              type: "matrixdynamic",
              name: "serviceLines",
              title: "Box 24 - Service lines",
              rowCount: 1,
              minRowCount: 0,
              maxRowCount: 6,
              addRowText: "Add service line",
              aiHint:
                "Box 24 is the six-row service table in the middle of the form. Return one object per row that has any printing in it, in the order they appear, and skip the empty rows; a row is empty when its date columns are blank. Read the columns strictly by their printed headings, left to right: 24A DATE(S) OF SERVICE is two dates, From then To, each MM DD YY - return both as YYYY-MM-DD; 24B PLACE OF SERVICE is a two-digit code such as 11 or 23; 24C EMG is usually blank, so leave it empty unless a letter is really printed; 24D is the five-character CPT/HCPCS code, and MODIFIER is the separate narrow column to its right, blank on most lines; 24E DIAGNOSIS POINTER is one or more LETTERS between A and L pointing at box 21 (never a number, and never the same text as the modifier); 24F $ CHARGES is dollars and cents in adjacent columns, so 145 00 is 145.00; 24G DAYS OR UNITS is a small number; 24H EPSDT is usually blank; 24J RENDERING PROVIDER ID is the ten-digit NPI printed on the lower of the row two lines, to the right of the pre-printed NPI label. Return numbers for charges and units, not strings.",
              columns: [
                {
                  name: "dateFrom",
                  title: "24A from",
                  cellType: "text",
                  inputType: "date",
                },
                {
                  name: "dateTo",
                  title: "24A to",
                  cellType: "text",
                  inputType: "date",
                },
                { name: "placeOfService", title: "24B POS", cellType: "text" },
                { name: "emg", title: "24C EMG", cellType: "text" },
                { name: "cptHcpcs", title: "24D CPT/HCPCS", cellType: "text" },
                { name: "modifier", title: "24D modifier", cellType: "text" },
                {
                  name: "diagnosisPointer",
                  title: "24E pointer",
                  cellType: "text",
                },
                {
                  name: "charges",
                  title: "24F charges",
                  cellType: "text",
                  inputType: "number",
                },
                {
                  name: "units",
                  title: "24G units",
                  cellType: "text",
                  inputType: "number",
                },
                { name: "epsdt", title: "24H EPSDT", cellType: "text" },
                {
                  name: "renderingProviderNpi",
                  title: "24J NPI",
                  cellType: "text",
                },
              ],
            },
          ],
        },
        {
          type: "panel",
          name: "billing",
          title: "Box 25-33 - Billing",
          elements: [
            {
              type: "text",
              name: "federalTaxId",
              title: "Box 25 - Federal tax ID",
              aiHint: "Box 25, bottom left of the form.",
            },
            {
              type: "radiogroup",
              name: "federalTaxIdType",
              title: "Box 25 - SSN or EIN",
              startWithNewLine: false,
              colCount: 2,
              choices: [
                { value: "ssn", text: "SSN" },
                { value: "ein", text: "EIN" },
              ],
              aiHint:
                "Box 25, two small checkboxes labelled SSN and EIN right of the tax ID.",
            },
            {
              type: "text",
              name: "patientAccountNo",
              title: "Box 26 - Patient's account no.",
              aiHint: "Box 26, the provider's own reference for the patient.",
            },
            {
              type: "boolean",
              name: "acceptAssignment",
              title: "Box 27 - Accept assignment?",
              startWithNewLine: false,
              aiHint: "Box 27, bottom of the form, ACCEPT ASSIGNMENT?. Each square sits to the LEFT of its YES or NO label.",
            },
            {
              type: "text",
              name: "totalCharge",
              title: "Box 28 - Total charge",
              inputType: "number",
              aiHint:
                "Box 28, dollars and cents in adjacent columns. '315 00' means 315.00.",
            },
            {
              type: "text",
              name: "amountPaid",
              title: "Box 29 - Amount paid",
              inputType: "number",
              startWithNewLine: false,
              aiHint: "Box 29, same dollars-and-cents layout as box 28.",
            },
            {
              type: "text",
              name: "providerSignature",
              title: "Box 31 - Provider signature",
              aiHint:
                "Box 31, on the SIGNED line. Often printed as SOF or SIGNATURE ON FILE.",
            },
            {
              type: "text",
              name: "providerSignatureDate",
              title: "Box 31 - Date",
              inputType: "date",
              startWithNewLine: false,
              aiHint: "Box 31, the DATE beside the signature. Return YYYY-MM-DD.",
            },
            {
              type: "text",
              name: "facilityName",
              title: "Box 32 - Service facility",
              aiHint: "Box 32, the first line of the service facility block.",
            },
            {
              type: "text",
              name: "facilityAddress",
              title: "Box 32 - Address",
              aiHint: "Box 32, the street line.",
            },
            {
              type: "text",
              name: "facilityCityStateZip",
              title: "Box 32 - City, state, ZIP",
              aiHint: "Box 32, the last line, as printed.",
            },
            {
              type: "text",
              name: "facilityNpi",
              title: "Box 32a - Facility NPI",
              aiHint: "Box 32a, the small field labelled a. immediately under the box 32 address block, left of the pre-printed NPI watermark. Ten digits.",
            },
            {
              type: "text",
              name: "billingName",
              title: "Box 33 - Billing provider",
              aiHint: "Box 33, the first line of the billing provider block.",
            },
            {
              type: "text",
              name: "billingAddress",
              title: "Box 33 - Address",
              aiHint: "Box 33, the street line.",
            },
            {
              type: "text",
              name: "billingCityStateZip",
              title: "Box 33 - City, state, ZIP",
              aiHint: "Box 33, the last line, as printed.",
            },
            {
              type: "text",
              name: "billingPhone",
              title: "Box 33 - Phone",
              aiHint:
                "Box 33, the PH # beside the heading. The area code sits inside the pre-printed parentheses; return (999) 999-9999.",
            },
            {
              type: "text",
              name: "billingNpi",
              title: "Box 33a - Billing NPI",
              aiHint: "Box 33a, the small field labelled a. immediately under the box 33 address block, at the bottom right of the form. Ten digits - it is printed even when it repeats box 32a.",
            },
          ],
        },
      ],
    },
  ],
  completedHtml: "<h4>Claim saved.</h4>",
};

export const insuranceClaimSchema: SchemaDefinition = {
  id: "insurance-claim",
  title: "Health Insurance Claim (CMS-1500)",
  description:
    "The standard US professional claim, box by box, with per-field extraction hints.",
  json: insuranceClaimJson,
};
