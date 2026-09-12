export const REFRESH_MS = 30000;

// Codes that aren't a single country's currency (supranational currencies,
// precious metals, IMF's SDR) — excluded from the board since the user
// wants countries, not commodities or abstract units.
export const EXCLUDED_CODES = new Set(["XAU", "XAG", "XPD", "XPT", "XDR"]);

// ISO 4217's first two letters are usually the ISO 3166-1 country code
// (that's by design), so a regional-indicator flag can be derived directly
// for most currencies. These are the exceptions: supranational currencies,
// and a couple of legacy/historical codes whose two-letter prefix no longer
// maps to a real territory.
const FLAG_OVERRIDES = {
  EUR: "🇪🇺",
  XOF: "🌍", // West African CFA franc — multiple countries
  XAF: "🌍", // Central African CFA franc — multiple countries
  XCD: "🌴", // East Caribbean dollar — multiple countries
  XPF: "🇵🇫", // CFP franc — French Pacific territories
  XCG: "🇨🇼", // Caribbean guilder — Curaçao & Sint Maarten
  ANG: "🇨🇼", // Netherlands Antillean guilder (legacy) — Curaçao
  CNH: "🇨🇳", // Offshore yuan — same flag as onshore
  MRO: "🇲🇷", // Legacy Mauritanian ouguiya
};

function flagFromCountryCode(cc) {
  return cc
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

export function flagForCurrency(code) {
  if (FLAG_OVERRIDES[code]) return FLAG_OVERRIDES[code];
  return flagFromCountryCode(code.slice(0, 2));
}
