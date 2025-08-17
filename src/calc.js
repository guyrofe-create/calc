// src/calc.js
// פרסור תאריכים יציב + חישוב ביוץ/תל"מ/גיל-היריון ללא בעיות אזור-זמן.

/** יוצר Date ב-UTC (צהריים) כדי למנוע קפיצות יום */
function makeUTCDate(y, m /*0-11*/, d) {
  return new Date(Date.UTC(y, m, d, 12, 0, 0));
}

/** מוסיף/מוריד ימים לתאריך UTC */
export function addDaysUTC(dateUTC, days) {
  const ms = dateUTC.getTime() + days * 86400000;
  return new Date(ms);
}

/** פורמט תאריך YYYY-MM-DD */
export function fmtUTC(dateUTC) {
  const y = dateUTC.getUTCFullYear();
  const m = String(dateUTC.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dateUTC.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** פרסור גמיש – תומך: yyyy-mm-dd, dd/mm/yyyy, dd.mm.yyyy, yyyymmdd */
export function getLmpDateUTCFromInput(raw) {
  if (!raw) return null;
  const s = String(raw).trim();

  // ISO: 2025-08-17
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const y = +m[1], mo = +m[2]-1, d = +m[3];
    return makeUTCDate(y, mo, d);
  }

  // dd/mm/yyyy או dd.mm.yyyy
  m = s.match(/^(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{4})$/);
  if (m) {
    const d = +m[1], mo = +m[2]-1, y = +m[3];
    return makeUTCDate(y, mo, d);
  }

  // yyyymmdd – למשל 17082025
  m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) {
    const y = +m[1], mo = +m[2]-1, d = +m[3];
    return makeUTCDate(y, mo, d);
  }

  return null;
}

/** חישוב מלא מתוך קלטים (תאריך גולמי + אורך מחזור) */
export function calculateFromInputs(rawDateValue, cycleValue) {
  const lmp = getLmpDateUTCFromInput(rawDateValue);
  const cycle = Math.min(45, Math.max(21, parseInt(cycleValue, 10) || 28));
  if (!lmp) {
    return { error: 'תאריך לא תקין. נסי 2025-08-17 או 17/08/2025 או 17082025' };
  }

  const due       = addDaysUTC(lmp, 280);         // 40 שבועות
  const ovulation = addDaysUTC(lmp, cycle - 14);  // ביוץ משוער
  const fertileS  = addDaysUTC(ovulation, -2);    // חלון פוריות
  const fertileE  = addDaysUTC(ovulation,  1);

  // "היום" – UTC בצהריים כדי להימנע מהיסטי אזור־זמן
  const now = new Date();
  const today = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0
  ));
  const diffDays = Math.floor((today - lmp) / 86400000);
  const gaText = diffDays >= 0
    ? `${Math.floor(diffDays/7)}ש׳ + ${diffDays%7}י׳ (היום)`
    : 'טרום-ווסת אחרונה';

  return {
    lmp: fmtUTC(lmp),
    ovulation: fmtUTC(ovulation),
    fertile: `${fmtUTC(fertileS)}–${fmtUTC(fertileE)}`,
    due: fmtUTC(due),
    ga: gaText
  };
}

