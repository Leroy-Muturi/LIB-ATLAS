// api/scan.js
// Vercel serverless function — proxies tender scan requests to Anthropic API
// Runs server-side so CORS is never an issue and API key is never exposed

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  const today = new Date().toDateString();

  const prompt = `You are a tender intelligence analyst for Laser Insurance Brokers Limited (LIB), Kenya.

TODAY IS ${today}. Search the web for ALL insurance tenders posted in Kenya in the LAST 7 DAYS ONLY.

Search these sources thoroughly:
- tenders.go.ke (PPIP portal)
- egp.go.ke (Kenya EGP)
- ppra.go.ke
- tenderyetu.com
- kpa.co.ke, kengen.co.ke, kplc.co.ke, kws.go.ke, kra.go.ke, kpc.co.ke, gdc.co.ke, ketraco.co.ke, kaa.go.ke
- nairobi.go.ke, mombasa.go.ke, kisumu.go.ke and other county government procurement pages
- uonbi.ac.ke, ku.ac.ke, jkuat.ac.ke, moi.ac.ke, egerton.ac.ke and other university tender pages
- knh.or.ke, mtrh.go.ke and hospital procurement pages
- nairobiwater.co.ke and other water utility procurement pages
- unhcr.org, unicef.org, worldvision.co.ke, amref.org, wfp.org, redcross.or.ke

Look for: insurance brokerage services, medical insurance, GPA, WIBA, group life, motor fleet, fire and property, marine insurance, last expense, post-retirement medical.

For EACH tender found return exactly this structure:
{
  "no": "tender/RFQ reference number or null",
  "entity": "full organization name",
  "desc": "what is being procured",
  "cat": "Medical / General / GPA+WIBA / Group Life / Mixed / Marine / Motor Fleet",
  "posted": "YYYY-MM-DD",
  "closed": "YYYY-MM-DD",
  "deadline": "YYYY-MM-DD HH:MM AM/PM",
  "broker": "current broker if publicly known or null",
  "underwriter": "current underwriter if publicly known or null",
  "amount": estimated value as number in KES or null,
  "source": "website domain where found",
  "docUrl": "direct URL to tender document if freely downloadable without login, otherwise null",
  "status": "Open or Closed",
  "notes": "key details, bid security amount, submission requirements, any intel"
}

IMPORTANT:
- Only include tenders posted in the LAST 7 DAYS
- docUrl must be a direct PDF/document link, not a login page
- If document requires login or payment, set docUrl to null
- amount must be a plain number (e.g. 5000000) not a string
- Return ONLY a valid JSON array. No markdown. No backticks. No explanation.
- If nothing found in last 7 days, return []`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 6000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    // Extract text blocks only
    const text = (data.content || [])
      .filter(b => b.type === 'text' && typeof b.text === 'string')
      .map(b => b.text)
      .join('\n');

    // Find JSON array
    const clean = text.replace(/```json|```/gi, '').trim();
    const match = clean.match(/\[[\s\S]*\]/);

    if (!match) {
      return res.status(200).json({ tenders: [], message: 'No new tenders found in last 7 days' });
    }

    const tenders = JSON.parse(match[0]);
    return res.status(200).json({ tenders, scannedAt: new Date().toISOString() });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
