import { BASE, PASSWORD, SHOTS, finish, launch, resetLoginAttempts } from './common.mjs';

await resetLoginAttempts();
const browser = await launch();
const results = {};

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
const analytics = [];
page.on('request', (r) => { if (r.url().includes('google-analytics.com') || r.url().includes('googletagmanager.com')) analytics.push(r.url()); });
page.on('pageerror', (e) => errors.push(e.message));

// 1. Visiting /admin signed out lands on login with ?next preserved.
await page.goto(`${BASE}/admin/library?kind=VIDEO`);
results.redirectedToLogin = page.url().includes('/admin/login?next=%2Fadmin%2Flibrary%3Fkind%3DVIDEO');
results.noSiteChromeOnLogin = (await page.locator('header').count()) === 0 && (await page.locator('footer').count()) === 0;
await page.screenshot({ path: `${SHOTS}/admin-login.png` });

// 2. Wrong password shows an error and stays on the login page.
await page.getByLabel('Password').fill('not the password');
await page.getByRole('button', { name: /sign in/i }).click();
await page.locator('form [role="alert"]').waitFor();
results.wrongPasswordMessage = (await page.locator('form [role="alert"]').textContent()) === 'Incorrect password.';

// 3. Correct password signs in, honours ?next (which is a 404 for now, so check the cookie instead) and sets an HttpOnly cookie.
await page.getByLabel('Password').fill(PASSWORD);
await page.getByRole('button', { name: /sign in/i }).click();
await page.waitForURL((u) => !u.pathname.endsWith('/login'), { waitUntil: 'commit' });
const cookies = await page.context().cookies();
const session = cookies.find((c) => c.name === 'sw_admin');
results.sessionCookie = !!session && session.httpOnly && session.sameSite === 'Lax';

// 4. Dashboard renders inside the admin shell with the site's styling.
await page.goto(`${BASE}/admin`);
results.dashboardVisible = await page.getByRole('heading', { name: 'Admin', exact: true }).isVisible();
results.statsShown = (await page.getByText('Photos', { exact: true }).count()) === 1;
results.navHasDashboard = await page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Dashboard' }).isVisible();
results.dashboardCurrent = (await page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Dashboard' }).getAttribute('aria-current')) === 'page';
await page.screenshot({ path: `${SHOTS}/admin-dashboard-light.png` });

// Theme tokens come from the site: body background matches --bg in each theme.
const bgLight = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
await page.getByRole('button', { name: 'Toggle dark mode' }).click();
await page.waitForTimeout(300);
const bgDark = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
results.lightBgIsCream = bgLight === 'rgb(248, 243, 236)';
results.darkBgIsEspresso = bgDark === 'rgb(23, 19, 15)';
await page.screenshot({ path: `${SHOTS}/admin-dashboard-dark.png` });
await page.getByRole('button', { name: 'Toggle dark mode' }).click();

// 5. The API accepts the session cookie.
const apiStatus = await page.evaluate(async () => (await fetch('/api/admin/session')).status);
results.apiAcceptsSession = apiStatus === 200;

// 6. Mobile layout: section nav row appears, no horizontal scroll.
await page.setViewportSize({ width: 375, height: 812 });
await page.waitForTimeout(200);
results.noHorizontalScrollMobile = (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) === 0;
await page.screenshot({ path: `${SHOTS}/admin-dashboard-mobile.png` });
await page.setViewportSize({ width: 1280, height: 800 });

// 7. Log out returns to login and the API rejects again.
await page.getByRole('button', { name: 'Log out' }).click();
await page.waitForURL('**/admin/login');
results.loggedOut = (await page.evaluate(async () => (await fetch('/api/admin/session')).status)) === 401;

// 8. Five wrong attempts lock the form; the lock message names a wait time.
for (let i = 0; i < 5; i++) {
  await page.getByLabel('Password').fill(`wrong-${i}`);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForTimeout(500);
}
await page.getByLabel('Password').fill(PASSWORD);
await page.getByRole('button', { name: /sign in/i }).click();
await page.getByText(/Too many attempts/).waitFor();
results.lockedAfterFiveFailures = /Try again in \d+ minutes?\./.test(await page.locator('form [role="alert"]').textContent());

results.noPageErrors = errors.length === 0;
results.noAnalyticsOnAdmin = analytics.length === 0;
await browser.close();
finish(results, errors);
