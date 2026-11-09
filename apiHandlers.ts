import { GoogleGenAI } from '@google/genai';

type ApiResult = {
  status: number;
  body: Record<string, unknown>;
};

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  return apiKey
    ? new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      })
    : null;
}

export async function handleApiRequest(
  path: string,
  method: string,
  body: any = {},
): Promise<ApiResult> {
  const endpoint = path.replace(/\/+$/, '').split('/').pop();

  if (method === 'GET' && endpoint === 'health') {
    return { status: 200, body: { status: 'ok', hasAi: Boolean(process.env.GEMINI_API_KEY) } };
  }

  if (method !== 'POST') {
    return { status: 405, body: { error: 'Method not allowed' } };
  }

  if (endpoint === 'underwrite') {
    const { units, totalCost, fundingSources, amiTarget, location, targetPopulation } = body;
    const ai = getAiClient();

    try {
      if (!ai) {
        return {
          status: 200,
          body: {
            analysis: generateFallbackAnalysis(units, totalCost, amiTarget),
            isLiveAi: false,
          },
        };
      }

      const prompt = `You are a Senior Affordable Housing Underwriter and Public Finance Strategist specializing in 100% non-dilutive federally funded multi-family real estate developments (Missing Middle infill 10-20 units).
Analyze this deal structure:
- Unit Count: ${units} units
- Total Development Cost (TDC): $${Number(totalCost).toLocaleString()}
- Cost Per Unit: $${Math.round(Number(totalCost) / (units || 1)).toLocaleString()}
- Target AMI (Area Median Income): ${amiTarget}% AMI
- Location / Market: ${location || 'Urban/Suburban Infill'}
- Target Resident Population: ${targetPopulation || 'Workforce / Mixed Low-Income Families'}
- Proposed Capital Stack:
${JSON.stringify(fundingSources, null, 2)}

Provide a concise, institutional underwriting assessment covering:
1. Capital Stack Feasibility (HUD Subsidy Layering Review guidelines, 24 CFR Part 92 / Part 93 compliance).
2. Davis-Bacon Prevailing Wage Triggers (Note: HUD HOME has a 12-unit threshold; discuss implications for ${units} units).
3. Section 8 Project-Based Voucher (PBV) Integration to guarantee debt service & operating viability.
4. Clean Energy Inflation Reduction Act (IRA Section 45L $5,000/unit & Section 48(e) Low-Income Solar Tax Credit) bonus equity strategy.
5. 3 specific recommendations to optimize the grant draw schedule and maximize the 10-15% Developer Fee cash payout.
Keep response structured, authoritative, and direct.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'You are an institutional HUD / LIHTC / Public Housing finance underwriter providing expert feedback to real estate developers.',
        },
      });

      return {
        status: 200,
        body: {
          analysis: response.text || generateFallbackAnalysis(units, totalCost, amiTarget),
          isLiveAi: true,
        },
      };
    } catch (error: any) {
      console.error('AI underwrite error:', error);
      return {
        status: 200,
        body: {
          analysis: generateFallbackAnalysis(units, totalCost, amiTarget),
          isLiveAi: false,
          error: error.message,
        },
      };
    }
  }

  if (endpoint === 'grant-narrative') {
    const { programName, projectTitle, units, location, totalCost, fundingRequested } = body;
    const ai = getAiClient();

    try {
      if (!ai) {
        return {
          status: 200,
          body: {
            narrative: `EXECUTIVE APPLICATION SUMMARY: ${projectTitle}\n\nProject Scope: ${units}-unit high-efficiency affordable housing community located in ${location}.\nTotal Development Cost: $${Number(totalCost).toLocaleString()}.\nGrant Request: $${Number(fundingRequested).toLocaleString()} via ${programName}.\n\nNeed Statement: The target market faces a documented deficit of affordable housing units for households earning below 50% AMI. This project achieves 100% public capital stacking, ensuring long-term affordability covenants (30-year deed restriction) with zero required tenant displacement.`,
            isLiveAi: false,
          },
        };
      }

      const prompt = `Draft a formal Grant Application Executive Summary and Statement of Public Need for an affordable housing funding submission:
- Funding Program: ${programName} (e.g. HUD HOME Investment Partnerships / National Housing Trust Fund / FHLB AHP)
- Project Name: ${projectTitle}
- Unit Count: ${units} units
- Location: ${location}
- Total Development Cost: $${Number(totalCost).toLocaleString()}
- Grant Amount Requested: $${Number(fundingRequested).toLocaleString()}

Write 3 formal sections ready to paste into the state Housing Finance Agency (HFA) or HUD application portal:
1. Executive Project Summary & Mission Alignment
2. Statement of Housing Need & Income Targeting (30%-60% AMI)
3. Financial Feasibility & Public Subsidy Layering Justification`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'You are an expert grant writer for multi-family affordable housing developments and tax credit syndications.',
        },
      });

      return {
        status: 200,
        body: { narrative: response.text, isLiveAi: true },
      };
    } catch (error: any) {
      console.error('Grant narrative error:', error);
      return { status: 500, body: { error: error.message } };
    }
  }

  return { status: 404, body: { error: 'Not found' } };
}

function generateFallbackAnalysis(units: number, totalCost: number, amiTarget: number) {
  const isDavisBacon = units >= 12;
  return `### Institutional Underwriting Assessment (${units} Units)

**1. Subsidy Layering & 100% Capital Stack Viability**
- Total Development Cost: $${Number(totalCost).toLocaleString()} ($${Math.round(Number(totalCost) / (units || 1)).toLocaleString()}/unit).
- With 100% public/federal stack engineering, the project qualifies under HUD 24 CFR 92.250 subsidy layering rules. The absence of commercial high-interest first mortgage debt lowers operating break-even occupancy to ~62%.

**2. Prevailing Wage & Regulatory Thresholds**
- Davis-Bacon Threshold: **${isDavisBacon ? 'APPLIES (≥ 12 HOME units)' : 'EXEMPT (< 12 HOME units)'}**.
${isDavisBacon
  ? '- Because this project has 12 or more units funded by HUD HOME, Davis-Bacon federal prevailing wage rates apply to all construction trades. Ensure general contractor contracts include certified payroll reporting.'
  : '- Under 24 CFR 92.354, projects with fewer than 12 HOME-assisted units are exempt from federal Davis-Bacon prevailing wage requirements, reducing hard construction labor costs by 12% to 18%.'}

**3. Section 8 Project-Based Voucher (PBV) Cashflow Anchor**
- Securing 100% or 50% PBV allocation from the local Public Housing Authority (PHA) guarantees payments equal to HUD Fair Market Rent (FMR), protecting ongoing operations while serving ${amiTarget}% AMI residents.

**4. IRA Clean Energy Equity Boost**
- Section 45L ($5,000 per unit for Zero Energy Ready Home certification) yields **$${(units * 5000).toLocaleString()}** in direct tax credit equity or transferable cash credit.
- Section 48(e) low-income solar bonus increases investment tax credit up to 50% of solar installation costs.

**5. Developer Fee Cash Extraction**
- Allowable Developer Fee under state QAP guidelines is 10%–15% of TDC ($${Math.round(totalCost * 0.12).toLocaleString()} at 12%). Schedule draws across 3 milestones: 30% at Initial Closing/Drawdown, 40% at 50% Construction Inspection, 30% at Final 8609/Certificate of Occupancy.`;
}
