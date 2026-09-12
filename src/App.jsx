import { useEffect, useRef, useState, useCallback } from "react";
import { REFRESH_MS, EXCLUDED_CODES, flagForCurrency } from "./currencies";
import "./index.css";

const CURRENCIES_URL = "https://api.frankfurter.dev/v2/currencies";
const RATES_URL = "https://api.frankfurter.dev/v2/rates?base=usd";

function formatValue(v) {
  if (v == null) return "—";
  const decimals = v >= 100 ? 2 : v >= 10 ? 3 : 4;
  return v.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default function App() {
  const [meta, setMeta] = useState(null); // { CODE: { name, symbol } }
  const [rates, setRates] = useState(null);
  const [prevRates, setPrevRates] = useState(null);
  const [asOf, setAsOf] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const [error, setError] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_MS / 1000);
  const [now, setNow] = useState(new Date());
  const ratesRef = useRef(null);

  // Currency names/symbols rarely change — fetch once on load.
  useEffect(() => {
    fetch(CURRENCIES_URL)
      .then((res) => res.json())
      .then((list) => {
        const map = {};
        for (const c of list) {
          if (EXCLUDED_CODES.has(c.iso_code)) continue;
          map[c.iso_code] = { name: c.name, symbol: c.symbol };
        }
        setMeta(map);
      })
      .catch(() => setMeta({}));
  }, []);

  const fetchRates = useCallback(async () => {
    try {
      const res = await fetch(RATES_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = await res.json();
      const next = {};
      let newestDate = null;
      for (const row of rows) {
        if (EXCLUDED_CODES.has(row.quote)) continue;
        next[row.quote] = row.rate;
        if (!newestDate || row.date > newestDate) newestDate = row.date;
      }
      setPrevRates(ratesRef.current);
      ratesRef.current = next;
      setRates(next);
      setAsOf(newestDate);
      setLastFetched(new Date());
      setError(null);
    } catch (err) {
      setError(err.message || "Fetch failed");
    } finally {
      setSecondsLeft(REFRESH_MS / 1000);
    }
  }, []);

  useEffect(() => {
    fetchRates();
    const poll = setInterval(fetchRates, REFRESH_MS);
    return () => clearInterval(poll);
  }, [fetchRates]);

  useEffect(() => {
    const tick = setInterval(() => {
      setNow(new Date());
      setSecondsLeft((s) => (s > 0 ? +(s - 1).toFixed(1) : 0));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const dateLabel = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeLabel = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });

  // Codes to render: every code we have a rate for (falls back to meta keys
  // before the first successful poll so the board isn't empty on load).
  const codes = rates
    ? Object.keys(rates).sort()
    : meta
      ? Object.keys(meta).sort()
      : [];

  return (
    <div className="board">
      <header className="board__header">
        <div className="board__title">
          <span className="board__mark">Plurg</span>
          <span className="board__title-text">Exchange Board</span>
        </div>
        <div className="board__clock">
          <div className="board__date">{dateLabel}</div>
          <div className="board__time">{timeLabel}</div>
        </div>
      </header>

      <div className="board__meta">
        <span>
          Base currency <strong>1 USD</strong> 🇺🇸
        </span>
        <span className="board__meta-divider" aria-hidden="true">
          |
        </span>
        <span>
          Latest reference date <strong>{asOf ?? "—"}</strong>
        </span>
        <span className="board__meta-divider" aria-hidden="true">
          |
        </span>
        <span>
          <strong>{codes.length || "—"}</strong> currencies
        </span>
        <span className="board__meta-divider" aria-hidden="true">
          |
        </span>
        <span className={`board__status ${error ? "is-error" : ""}`}>
          <strong>
            {error
              ? `Feed error — ${error}, retrying`
              : lastFetched
                ? `Synced ${lastFetched.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                  })} · next in ${Math.ceil(secondsLeft)}s`
                : "Connecting…"}
          </strong>
        </span>
      </div>

      <main className="board__grid">
        {codes.map((code) => {
          const value = rates ? rates[code] : null;
          const prev = prevRates ? prevRates[code] : null;
          let dir = "";
          if (
            code !== "USD" &&
            value != null &&
            prev != null &&
            value !== prev
          ) {
            dir = value > prev ? "up" : "down";
          }
          const name = meta?.[code]?.name || code;
          return (
            <div className="row" key={code} data-dir={dir}>
              <span className="row__flag" aria-hidden="true">
                {flagForCurrency(code)}
              </span>
              <span className="row__code">{code}</span>
              <span className="row__name">{name}</span>
              <span className="row__arrow" aria-hidden="true">
                ⇒
              </span>
              <span className="row__value">{formatValue(value)}</span>
            </div>
          );
        })}
      </main>

      <footer className="board__footer">
        Plurg Exchange Board . Via Frankfurter API (api.frankfurter.dev) . Music
        track: Foreign by Moavii | Source: https://freetouse.com/music | Royalty
        Free Music (Free Download)
      </footer>
    </div>
  );
}
