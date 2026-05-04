// PDF text extraction using pdf-parse
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export async function extractPDFText(buffer) {
  try {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (e) {
    console.error('PDF parse error:', e.message);
    return '';
  }
}

// Parse extracted text to find quotation fields
export function parseRFQFromText(text) {
  const result = {};

  // Quotation / RFQ number: เลขที่ 26/007 or similar
  const rfqNo = text.match(/เลขที่\s*([\d\/]+)/) ||
                text.match(/RFQ[:\s#]*([\w\-\/]+)/i) ||
                text.match(/Quotation[:\s#]*([\d\/]+)/i);
  if (rfqNo) result.rfq_number = rfqNo[1].trim();

  // Date: D/M/YYYY or YYYY-MM-DD
  const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dateMatch) {
    const [,d,m,y] = dateMatch;
    result.received_date = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }

  // Contact person
  const contact = text.match(/Contact\s+Person[\s\S]{0,30}?(K\.[A-Z][A-Z\s]+)/i) ||
                  text.match(/Contact\s+Person\s*\n\s*([A-Z][A-Z\s.]+)/i);
  if (contact) result.customer_contact = contact[1].trim();

  // Delivery days: DELIVERY 45 DAY
  const deliv = text.match(/DELIVERY\s+(\d+)\s+DAY/i);
  if (deliv) result.delivery_days = parseInt(deliv[1]);

  // Customer name: look for company patterns
  const company = text.match(/Microchip Technology[^\n]*/i) ||
                  text.match(/Company\s*\/[^:]+:\s*([^\n]+)/i);
  if (company) result.customer_name = company[0].trim();

  // Extract line items from table-like text
  result.items = parseLineItems(text);

  return result;
}

function parseLineItems(text) {
  const items = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Look for lines with: number description qty price amount pattern
  // e.g. "1 Dow DOWSIL™ 736... 4 975.00 3,900.00"
  const itemPattern = /^(\d+)\s+(.+?)\s+(\d+(?:\.\d+)?)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)$/;

  for (const line of lines) {
    const m = line.match(itemPattern);
    if (m) {
      const qty   = parseFloat(m[3]);
      const price = parseFloat(m[4].replace(/,/g,''));
      const amt   = parseFloat(m[5].replace(/,/g,''));
      if (qty > 0 && price > 0) {
        items.push({
          item_no:      parseInt(m[1]),
          description:  m[2].trim(),
          quantity:     qty,
          unit:         'EA',
          target_price: price,
          our_price:    price,
          amount:       amt || qty * price,
        });
      }
    }
  }

  return items;
}
