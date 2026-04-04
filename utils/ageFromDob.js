/**
 * Date-only DOB as YYYY-MM-DD (UTC calendar date; parsed in local server TZ for age math).
 */

function parseYmd(dateOfBirthStr) {
  if (!dateOfBirthStr || typeof dateOfBirthStr !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirthStr.trim());
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const d = parseInt(m[3], 10);
  if (mo < 0 || mo > 11 || d < 1 || d > 31) return null;
  const birth = new Date(y, mo, d);
  if (Number.isNaN(birth.getTime())) return null;
  if (birth.getFullYear() !== y || birth.getMonth() !== mo || birth.getDate() !== d) return null;
  return birth;
}

/**
 * Age in full years at `asOf` (default: now on server).
 */
function calculateAgeFromDob(dateOfBirthStr, asOf = new Date()) {
  const birth = parseYmd(dateOfBirthStr);
  if (!birth) return null;
  if (birth > asOf) return null;
  let age = asOf.getFullYear() - birth.getFullYear();
  const md = asOf.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && asOf.getDate() < birth.getDate())) age--;
  if (age < 0 || age > 130) return null;
  return age;
}

function validateDobString(input) {
  if (input === '' || input === null || input === undefined) {
    return { ok: true, normalized: null };
  }
  if (typeof input !== 'string') {
    return { ok: false, error: 'dateOfBirth must be a string YYYY-MM-DD' };
  }
  const birth = parseYmd(input);
  if (!birth) {
    return { ok: false, error: 'Invalid dateOfBirth; use YYYY-MM-DD' };
  }
  const today = new Date();
  const min = new Date(today.getFullYear() - 130, today.getMonth(), today.getDate());
  if (birth > today) {
    return { ok: false, error: 'Date of birth cannot be in the future' };
  }
  if (birth < min) {
    return { ok: false, error: 'Date of birth is too far in the past' };
  }
  const y = birth.getFullYear();
  const mo = String(birth.getMonth() + 1).padStart(2, '0');
  const d = String(birth.getDate()).padStart(2, '0');
  return { ok: true, normalized: `${y}-${mo}-${d}` };
}

function enrichProfileResponse(profileDoc) {
  const o =
    profileDoc && typeof profileDoc.toObject === 'function'
      ? profileDoc.toObject()
      : { ...profileDoc };
  if (o.dateOfBirth) {
    o.age = calculateAgeFromDob(o.dateOfBirth);
  }
  return o;
}

module.exports = {
  parseYmd,
  calculateAgeFromDob,
  validateDobString,
  enrichProfileResponse,
};
