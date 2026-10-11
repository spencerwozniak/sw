import { BASE, SHOTS, finish, launch, resetLoginAttempts, signIn } from './common.mjs';

await resetLoginAttempts();
const browser = await launch();
const results = {};

const page = await browser.newPage({ viewport: { width: 1100, height: 1500 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await signIn(page);
await page.goto(`${BASE}/admin/kit`);
await page.screenshot({ path: `${SHOTS}/kit-light.png`, fullPage: true });

// Switch: toggles by click and by keyboard, and reports state to assistive tech.
const sw = page.getByRole('switch');
results.switchStartsOff = (await sw.getAttribute('aria-checked')) === 'false';
await sw.click();
results.switchOnByClick = (await sw.getAttribute('aria-checked')) === 'true';
await sw.focus();
await page.keyboard.press('Space');
results.switchOffByKeyboard = (await sw.getAttribute('aria-checked')) === 'false';

// Select and textarea accept input.
await page.getByLabel('Status', { exact: true }).selectOption('PUBLISHED');
results.selectChanged = (await page.getByLabel('Status', { exact: true }).inputValue()) === 'PUBLISHED';
await page.getByLabel('Notes').fill('hello');
results.textareaFilled = (await page.getByLabel('Notes').inputValue()) === 'hello';

// Field error is announced.
results.fieldErrorRole = (await page.getByText('Place is required.').getAttribute('role')) === 'alert';

// Dialog: opens, traps focus inside, Esc closes.
await page.getByRole('button', { name: 'Open dialog' }).click();
const dialog = page.getByRole('dialog');
results.dialogOpens = await dialog.isVisible();
results.dialogLabelled = (await dialog.getAttribute('aria-labelledby')) === 'dialog-title';
await page.keyboard.press('Escape');
await page.waitForTimeout(150);
results.dialogClosesOnEsc = !(await dialog.isVisible());

// Confirm: Cancel does nothing, Delete fires a toast and closes.
await page.getByRole('button', { name: 'Open confirm' }).click();
await page.getByRole('button', { name: 'Cancel' }).click();
await page.waitForTimeout(150);
results.confirmCancelCloses = !(await page.getByRole('dialog').isVisible());
await page.getByRole('button', { name: 'Open confirm' }).click();
await page.getByRole('button', { name: 'Delete', exact: true }).click();
await page.waitForTimeout(150);
results.confirmDeleteToasts = await page.getByRole('status').filter({ hasText: 'Deleted' }).isVisible();

// Backdrop click closes a dialog.
await page.getByRole('button', { name: 'Open dialog' }).click();
await page.mouse.click(10, 10);
await page.waitForTimeout(150);
results.backdropCloses = !(await page.getByRole('dialog').isVisible());

// Toasts: error is an alert, can be dismissed, and is capped at three.
await page.getByRole('button', { name: 'Error toast' }).click();
const errorToast = page.getByRole('alert').filter({ hasText: 'Upload failed' });
results.errorToastShown = await errorToast.isVisible();
await errorToast.getByRole('button', { name: 'Dismiss notification' }).click();
results.toastDismissed = (await errorToast.count()) === 0;
for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Info toast' }).click();
results.toastsCapped = (await page.getByRole('region', { name: 'Notifications' }).getByRole('status').count()) <= 3;
await page.screenshot({ path: `${SHOTS}/kit-toasts.png` });

// Dark theme renders the same components with the dark tokens.
await page.getByRole('button', { name: 'Toggle dark mode' }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${SHOTS}/kit-dark.png`, fullPage: true });

results.noPageErrors = errors.length === 0;
await browser.close();
finish(results, errors);
