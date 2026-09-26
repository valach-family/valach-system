// v3app/assistant/meter.mjs — AST-03: A SEGÉD FOGYASZTÁSÁNAK MÉRÉSE (R89 §6).
//
// A SZABÁLY, AMIT EZ A MODUL TESTESÍT MEG: „Rögzítendő mérés: hívás-, input-, output-, cache-token
// és késleltetés; csak valóban elérhető díjadatból pénzösszeg. Ismeretlen fogyasztás vagy ár:
// hiány/null, nem nulla."
//
// EZÉRT: minden token-mező `null`-lal indul, és CSAK akkor kap számot, ha a szolgáltató válasza
// tartalmazta. A `cost_usd` addig `null`, amíg NINCS ellenőrzött díj-adat — és az `PRICES` tábla
// SZÁNDÉKOSAN ÜRES, kimondva. A nulla ár HAMIS ÁLLÍTÁS lenne, nem óvatos becslés (KUKA-094: a
// hiányzó tanú nem zöld · KUKA-135: a kimaradás nem nulla).
//
// ÉS KÜLÖN KÖNYV: a FEJLESZTŐI munkamenet fogyasztása és a TERMÉK chatjének fogyasztása két külön
// mérés (R89 §9) — ez a modul KIZÁRÓLAG a termék chatjéé.

/**
 * A DÍJ-TÁBLA SZÁNDÉKOSAN ÜRES — kimondva (R89 §6).
 *
 * Ellenőrzött, a szolgáltatótól származó díj-adat nélkül pénzösszeget NEM számolunk. Amikor egy
 * modellhez hitelesített ár kerül ide (`{ '<modell>': { input_per_mtok, output_per_mtok, currency } }`),
 * a `finish()` magától számol — addig a `cost` mező `null`, és a felület a „nincs adat" szót írja ki.
 */
export const PRICES = Object.freeze({});

const num = (v) => (Number.isFinite(v) ? v : null);

/** Egy mérés kezdete. A hívó a `finish()`-szel zárja; a kettő különbsége a KÖR fogyasztása. */
export function newMeter({ now = () => Date.now() } = {}) {
  const started = now();
  const calls = [];
  return {
    /** EGY hívás eredménye. `usage` nélkül a token-mezők `null`-ok maradnak — nem nullák. */
    record({ kind, ok, reason = null, ms = null, model = null, usage = null }) {
      calls.push(Object.freeze({
        kind,                                  // 'local' | 'model'
        ok: Boolean(ok),
        reason,
        ms: num(ms),
        model,
        input_tokens: usage ? num(usage.input_tokens) : null,
        output_tokens: usage ? num(usage.output_tokens) : null,
        cache_tokens: usage ? num(usage.cache_tokens) : null,
      }));
    },
    /** A ZÁRÁS — a mérés alakja, a HIÁNY kimondásával. */
    finish() {
      const model = calls.filter((c) => c.kind === 'model');
      const sum = (f) => {
        const vals = model.map(f);
        if (!vals.length || vals.some((v) => v === null)) return null;   // a null nem nulla
        return vals.reduce((a, b) => a + b, 0);
      };
      const inTok = sum((c) => c.input_tokens);
      const outTok = sum((c) => c.output_tokens);
      const cacheTok = sum((c) => c.cache_tokens);
      const models = [...new Set(model.map((c) => c.model).filter(Boolean))];
      const price = models.length === 1 ? PRICES[models[0]] : undefined;
      const cost = (price && inTok !== null && outTok !== null)
        ? Object.freeze({
          amount: (inTok / 1e6) * price.input_per_mtok + (outTok / 1e6) * price.output_per_mtok,
          currency: price.currency, source: 'ellenőrzött díj-adat a PRICES táblából',
        })
        : null;
      return Object.freeze({
        window_ms: Math.max(0, Date.now() - started),
        model_calls: model.length,
        local_answers: calls.filter((c) => c.kind === 'local').length,
        input_tokens: inTok,
        output_tokens: outTok,
        cache_tokens: cacheTok,
        latency_ms: model.length ? sum((c) => c.ms) : null,
        models: Object.freeze(models),
        cost,
        // A HIÁNY NEVEZVE, nem néma nulla (KUKA-093: a nulla lelet ott nem bizonyíték).
        missing: Object.freeze([
          ...(inTok === null ? ['input_tokens'] : []),
          ...(outTok === null ? ['output_tokens'] : []),
          ...(cacheTok === null ? ['cache_tokens'] : []),
          ...(cost === null ? ['cost (nincs ellenőrzött díj-adat ehhez a modellhez)'] : []),
        ]),
        calls: Object.freeze([...calls]),
      });
    },
  };
}

export const AST_METER_CONTRACT = Object.freeze({
  id: 'AST-03',
  owns: 'a termék chatjének fogyasztás-mérése: hívás · token · késleltetés · (ha van) pénzösszeg',
  null_is_not_zero: 'ismeretlen token és ismeretlen ár `null`; nulla ár SOHA nem íródik ki becslésként',
  prices_empty: 'a PRICES tábla szándékosan üres — ellenőrzött díj-adat nélkül nincs pénzösszeg',
  separate_books: 'a fejlesztői munkamenet fogyasztása MÁS mérés, nem ez',
});
