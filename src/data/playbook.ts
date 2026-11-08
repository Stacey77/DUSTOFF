import { PlaybookPhase } from '../types';

export const developerPlaybook: PlaybookPhase[] = [
  {
    phaseNumber: 1,
    title: 'Business Formation & Federal Registration',
    timeline: 'Weeks 1 – 4',
    objective: 'Establish a federally compliant real estate development entity eligible to receive federal funding, state housing grants, and bank sponsorships.',
    milestones: [
      {
        title: 'Form Single Asset Entity (SAE) LLC & HoldCo',
        description: 'Set up your Developer Holding Company (e.g. "CivicPeak Development LLC") and project-specific Single Purpose LLC (e.g. "Oakwood Flats 15 LLC") to ring-fence liability.',
        actionItems: [
          'File Articles of Organization with your State Secretary of State.',
          'Obtain Federal Employer Identification Number (EIN) from the IRS.',
          'Draft Operating Agreement with HUD/LIHTC compliant single-purpose entity clauses.',
          'Establish business checking accounts with a local community bank or credit union that is an FHLBank member.',
        ],
        proTip: 'Partner with or certify as a Community Housing Development Organization (CHDO) or create a Joint Venture with a local 501(c)(3) to access dedicated set-aside pools (15% of all federal HOME funds are legally reserved for CHDOs).',
        completed: true,
      },
      {
        title: 'SAM.gov & Unique Entity Identifier (UEI)',
        description: 'Register with the federal System for Award Management (SAM.gov) to be certified to receive direct federal awards, HUD grants, and federal pass-through contracts.',
        actionItems: [
          'Register your entity at SAM.gov to receive a 12-character alphanumeric Unique Entity Identifier (UEI).',
          'Obtain a Commercial and Government Entity (CAGE) Code.',
          'Complete the federal representations and certifications (FAR).',
          'Renew SAM.gov active registration annually to maintain good standing.',
        ],
        proTip: 'SAM.gov registration is 100% free. Never pay a third-party service; state APEX Accelerators (formerly PTAC) will assist free of charge.',
        completed: true,
      },
    ],
  },
  {
    phaseNumber: 2,
    title: 'Site Control & $0-Down Land Acquisition',
    timeline: 'Weeks 5 – 10',
    objective: 'Secure site control on parcels suitable for 10, 15, or 20 units with minimal upfront risk through options, land banks, or municipal surplus property.',
    milestones: [
      {
        title: 'Target Missing-Middle Infill Parcels (0.35 – 0.85 Acres)',
        description: 'Identify sites zoned for 10, 15, or 20 units near transit, grocery stores, and employment centers (critical for state QAP competitive scoring).',
        actionItems: [
          'Screen county GIS maps for city/county surplus tax-foreclosed parcels.',
          'Contact the local municipal Land Bank for $1 to $5,000 nominal affordable housing transfers.',
          'Verify zoning density: Look for multi-family, transit-oriented development (TOD), or state missing-middle upzoning legislation.',
          'Confirm utility capacity (water/sewer lateral lines, electrical grid access).',
        ],
        proTip: 'Small scale (10 to 20 units) bypasses massive neighborhood opposition (NIMBY) common to 100+ unit projects, dramatically speeding up municipal zoning approvals.',
        completed: false,
      },
      {
        title: 'Execute Contingent Purchase Option Agreement',
        description: 'Lock in site control with a 180 to 270-day purchase option conditioned upon securing federal funding awards.',
        actionItems: [
          'Offer $1,000 – $5,000 earnest money for an exclusive 6-to-9 month option.',
          'Include explicit contingency clause: "Contract subject to Buyer securing HOME / HTF / AHP federal grant financing commitments."',
          'Order Phase I Environmental Site Assessment (ESA) — mandatory for HUD Part 58 NEPA environmental clearance.',
        ],
        proTip: 'Municipalities will often grant a 12-month exclusive negotiating right (ENA) at $0 cost if you commit to reserving 100% of units for households under 60% AMI.',
        completed: false,
      },
    ],
  },
  {
    phaseNumber: 3,
    title: 'Pre-Development & Architectural Design Optimization',
    timeline: 'Weeks 11 – 16',
    objective: 'Create site plans, unit floorplans, and energy models that maximize federal point scoring and minimize construction cost per square foot.',
    milestones: [
      {
        title: 'Standardize Floorplans & Missing Middle Massing',
        description: 'Adopt repeatable modular or stick-built two-to-four story designs optimized for 10, 15, or 20 units.',
        actionItems: [
          'Program unit mix: 40% 1-Bedroom, 40% 2-Bedroom, 20% 3-Bedroom (aligns with PHA voucher demand).',
          'Ensure 5% of units are fully ADA accessible (UFAS / Section 504) and 2% sensory accessible.',
          'Engage an architect experienced in HUD Minimum Property Standards (MPS).',
          'Obtain preliminary building department site plan review approval.',
        ],
        proTip: 'For the 10-Unit archetype, keep total HOME-assisted units at 11 or fewer to remain statutorily exempt from Davis-Bacon prevailing wages, reducing contractor overhead by 15%.',
        completed: false,
      },
      {
        title: 'DOE Zero Energy Ready & Solar Engineering',
        description: 'Design the building envelope to qualify for the $5,000/unit IRA §45L tax credit and 50% solar ITC bonus under §48(e).',
        actionItems: [
          'Design continuous exterior insulation, heat-pump HVAC, and induction cooktops.',
          'Size rooftop solar array to cover 60%+ of tenant common and resident electric loads.',
          'Engage an accredited HERS rater to produce preliminary energy model score.',
        ],
        proTip: 'IRA clean energy credits can either be transferred for cash (IRC §6418) or collected directly under direct pay (§6417) to inject $80k to $350k in cash equity into your capital stack.',
        completed: false,
      },
    ],
  },
  {
    phaseNumber: 4,
    title: 'Federal Capital Stack Engineering & NOFA Applications',
    timeline: 'Weeks 17 – 26',
    objective: 'Assemble the 100% non-dilutive capital stack across HUD HOME, National HTF, FHLB AHP, and state soft funds to fund 100% of costs.',
    milestones: [
      {
        title: 'Apply to Local Participating Jurisdiction (HOME & CDBG)',
        description: 'Submit your formal funding request to the city/county housing department during their annual Action Plan allocation.',
        actionItems: [
          'Prepare pro-forma showing 100% capital stack with $0 private mortgage debt.',
          'Provide evidence of site control and Phase I environmental review.',
          'Secure City Council resolution of support and local commitment letter for $1M – $1.5M in HOME funds.',
        ],
        proTip: 'Local PJs are often under federal statutory pressure to commit their HOME funds within 24 months. Presenting a shovel-ready 10–20 unit infill project puts you at the front of the queue.',
        completed: false,
      },
      {
        title: 'Submit FHLB Affordable Housing Program (AHP) Application',
        description: 'Partner with an FHLB member bank to sponsor a $450k – $650k direct non-repayable grant application.',
        actionItems: [
          'Select an active FHLBank member commercial bank or credit union.',
          'Complete the online AHP scoring matrix (points for 30-50% AMI units, green building, and community empowerment).',
          'Execute bank sponsorship agreement.',
        ],
        proTip: 'Member banks love sponsoring AHP applications because it counts toward their mandatory Community Reinvestment Act (CRA) examination rating without putting their own balance sheet at risk.',
        completed: false,
      },
      {
        title: 'Secure Section 8 Project-Based Vouchers (PBV)',
        description: 'Request a commitment of 5 to 15 Project-Based Vouchers from the local Public Housing Authority (PHA).',
        actionItems: [
          'Respond to PHA PBV Request for Proposals (RFP) or request selection based on prior competitive federal grant award.',
          'Execute Agreement to enter into a Housing Assistance Payments contract (AHAP).',
          'Lock in 20-year guaranteed Fair Market Rent (FMR) payments direct from the federal government.',
        ],
        proTip: 'A 20-year PBV contract makes your property virtually recession-proof: even if market conditions deteriorate, HUD pays the voucher rent on the 1st of every month.',
        completed: false,
      },
    ],
  },
  {
    phaseNumber: 5,
    title: 'Financial Closing & General Contractor Bidding',
    timeline: 'Weeks 27 – 32',
    objective: 'Execute grant agreements, clear federal regulatory prerequisites, and award the construction contract with compliance monitoring.',
    milestones: [
      {
        title: 'Complete HUD Part 58 NEPA Environmental Clearance',
        description: 'The Responsible Entity (City/State) publishes Finding of No Significant Impact (FONSI) and obtains HUD Authority to Use Grant Funds (AUGF).',
        actionItems: [
          'Submit Phase I ESA, noise study, flood plain maps, and historic preservation SHPO concurrence.',
          'Public comment period (15 days) and HUD objection period (15 days).',
          'Obtain Form HUD-7015.16 (Authority to Use Grant Funds) prior to breaking ground.',
        ],
        proTip: 'Do not incur any choice-limiting construction or demolition costs before receiving your HUD AUGF, or the federal funds may be disqualified.',
        completed: false,
      },
      {
        title: 'Contractor Selection & Labor Compliance Protocol',
        description: 'Procure a general contractor experienced in federal public housing guidelines and prevailing wage reporting.',
        actionItems: [
          'If ≥12 HOME units: Incorporate Davis-Bacon wage determination rates into contractor bid specifications.',
          'Set up LCPtracker or automated certified weekly payroll reporting software.',
          'Implement Section 3 Economic Opportunities hiring plan for local low-income workers.',
        ],
        proTip: 'On 10-unit builds, verify with your PJ that you qualify for the <12 unit Davis-Bacon exemption, saving thousands in payroll administrative overhead.',
        completed: false,
      },
    ],
  },
  {
    phaseNumber: 6,
    title: 'Construction Drawdowns & Developer Fee Profit Cashout',
    timeline: 'Weeks 33 – 52',
    objective: 'Manage construction draws, disburse funding via HUD IDIS system, collect the 10%-15% Developer Fee cash profit, and lease up.',
    milestones: [
      {
        title: 'Cash Out 10% – 15% Developer Fee in Milestones',
        description: 'Under state and federal QAP rules, the developer earns a cash fee of $250,000 to $650,000 paid directly out of the capital stack.',
        actionItems: [
          'Draw Milestone 1 (30% at Initial Closing): $75k – $190k cash paid to Developer LLC.',
          'Draw Milestone 2 (40% at 50% Construction Completion): $100k – $250k cash paid to Developer LLC.',
          'Draw Milestone 3 (30% at Certificate of Occupancy & 8609/Final Closeout): $75k – $190k cash.',
        ],
        proTip: 'Developer fees in affordable housing are non-recourse cash revenue recognized as active business earnings, providing immediate working capital to start your next 15-20 unit project.',
        completed: false,
      },
      {
        title: 'Lease-Up with PHA Waiting List & Long-Term Asset Management',
        description: 'Fill 100% of units from the Public Housing Authority voucher waitlist and transition into long-term cash flow and asset management.',
        actionItems: [
          'Screen applicants referred by the local PHA voucher department.',
          'Execute HUD Model Lease with 30-year affordability rider.',
          'Collect monthly direct electronic HAP deposits from HUD/PHA into operating reserve.',
          'Pay yourself an ongoing Asset Management Fee of $1,500 – $2,500 per unit/year ($15,000 – $50,000/yr recurring cash flow).',
        ],
        proTip: 'Because you built the property with 100% federal grants and $0 bank mortgage debt, your operational break-even occupancy is only ~45%-60%, delivering fortress cashflow and capital preservation.',
        completed: false,
      },
    ],
  },
];
