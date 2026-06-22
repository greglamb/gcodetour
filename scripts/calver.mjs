/**
 * calver — CalVer math for the `0.YYMM.DDBB` scheme.
 *
 * Scheme: `0.YYMM.DDBB`. The patch segment is `DD` (day) + `BB` (build) with
 * leading zeros stripped for semver (so the 5th, build 1, is `501` not `0501`).
 * Up to 99 builds/day.
 */

/**
 * Compute the next `0.YYMM.DDBB` version after `current`, as of `now`.
 *
 * @param {string | undefined} current Current version, e.g. `"0.2606.502"`.
 * @param {Date} [now] Reference date (injectable for testing).
 * @returns {string} The next version, e.g. `"0.2606.503"`.
 */
export function nextCalVer(current, now = new Date()) {
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  let bb = 1;
  const match = /^0\.(\d{4})\.(\d+)$/.exec(current ?? "");
  if (match) {
    const oldYYMM = match[1];
    // Patch is DDBB with leading zeros stripped: the last two chars are BB,
    // the rest is DD (or "0" when only the build digits survived). Compare DD
    // and YYMM NUMERICALLY — not via string prefix — so a stripped "502" still
    // matches today's DD=05.
    const patch = match[2];
    const oldDD = patch.length > 2 ? patch.slice(0, -2) : "0";
    const oldBB = patch.length > 2 ? patch.slice(-2) : patch;
    if (
      Number(oldYYMM) === Number(`${yy}${mm}`) &&
      Number(oldDD) === Number(dd)
    ) {
      bb = Number(oldBB) + 1;
    }
  }
  if (bb > 99) {
    throw new Error(
      `Build counter would exceed 99 for today (current: ${current}). Wait until tomorrow.`
    );
  }
  const bbStr = String(bb).padStart(2, "0");
  // Strip leading zero on DDBB for semver compliance.
  const ddbb = String(Number(`${dd}${bbStr}`));
  return `0.${yy}${mm}.${ddbb}`;
}
