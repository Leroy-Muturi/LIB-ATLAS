// api/document.js
// Vercel serverless function — securely fetches and verifies tender documents
// Runs server-side, never exposes API key to browser

const SAFE_DOMAINS = [
  'tenders.go.ke', 'ppra.go.ke', 'egp.go.ke', 'ppip.go.ke',
  'kpa.co.ke', 'kengen.co.ke', 'kplc.co.ke', 'kws.go.ke', 'kemsa.go.ke',
  'kra.go.ke', 'kpc.co.ke', 'gdc.co.ke', 'kcaa.go.ke', 'ketraco.co.ke',
  'kaa.go.ke', 'krc.co.ke', 'nssf.or.ke', 'helb.co.ke', 'nema.go.ke',
  'kebs.go.ke', 'eacc.go.ke', 'parliament.go.ke', 'kmtc.ac.ke',
  'nairobiwater.co.ke', 'mombasawater.co.ke',
  'unhcr.org', 'unicef.org', 'worldvision.co.ke', 'redcross.or.ke',
  'amref.org', 'wfp.org', 'undp.org', 'who.int', 'akdn.org',
  'tenderyetu.com', 'globaltenders.com',
];

function isDomainSafe(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return SAFE_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))
      || hostname.endsWith('.go.ke')
      || hostname.endsWith('.ac.ke')
      || hostname.endsWith('.or.ke');
  } catch { return false; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'No URL provided' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  // Domain safety check
  if (!isDomainSafe(url)) {
    return res.status(200).json({
      ok: false,
      safe: false,
      reason: `Domain not on LIB verified safe list. Fetch blocked for security.`,
      requiresConfirmation: true,
      url,
    });
  }

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
        max_tokens: 4000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: `Fetch the tender document at this URL and extract its full text content.
URL: ${url}

Security checks to perform:
1. Verify it is a legitimate tender/procurement document
2. Confirm file type is PDF, DOCX, or HTML
3. Check for no executable scripts or malicious redirects
4. Extract all text content

Return ONLY valid JSON, no markdown:
{
  "ok": true or false,
  "safe": true or false,
  "fileType": "pdf" or "docx" or "html" or "unknown",
  "title": "document title",
  "extractedText": "full extracted text content here",
  "warnings": ["any warnings"],
  "reason": "brief explanation"
}`
        }],
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const text = (data.content || [])
      .filter(b => b.type === 'text' && typeof b.text === 'string')
      .map(b => b.text).join('\n');

    const clean = text.replace(/```json|```/gi, '').trim();
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Could not extract document content');

    const result = JSON.parse(match[0]);
    return res.status(200).json({ ...result, url });

  } catch (err) {
    return res.status(200).json({
      ok: false,
      safe: false,
      reason: err.message,
      url,
    });
  }
}
