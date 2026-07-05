// Playwright video recording — Squad dashboard end-to-end demo.
//
// What this records:
//   1. Aspire dashboard Resources page showing both squads + their cli +
//      terminalhost children.
//   2. Click into dev-squad-cli's Console logs (becomes the Terminal page
//      because we WithTerminal()'d the executable).
//   3. Click "Take control" to claim the PTY input.
//   4. Type "show me the team" + Enter into the live Copilot CLI session.
//   5. Wait for the coordinator's response to render in xterm.
//   6. Hold on the result for a beat so the viewer can read it.
//
// Output: a .webm video at the path passed as argv[2] (or the default below).

import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const loginUrl = process.argv[2];
const outDir   = process.argv[3] ?? 'C:\\Users\\tamirdresher\\source\\repos\\squad-squad\\squad-demo-video';

if (!loginUrl) {
    console.error('Usage: node playwright-record.mjs <login-url> [out-dir]');
    process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
    headless: false,         // headed so the user can watch live
    args: ['--ignore-certificate-errors'],
});
const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    ignoreHTTPSErrors: true,
    recordVideo: {
        dir: outDir,
        size: { width: 1600, height: 900 },
    },
});
const page = await context.newPage();

const slow  = (ms) => new Promise(r => setTimeout(r, ms));
const slide = async (label, ms = 1500) => {
    console.log(`[slide] ${label}`);
    await slow(ms);
};

try {
    // 1. Land on the Resources page.
    console.log('[step 1] navigating to dashboard…');
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=dev-squad', { timeout: 20000 });
    await slide('Resources page — both squads visible', 3000);

    // Show what's there: dev-squad + dev-squad-cli + dev-squad-cli-terminalhost-0.
    // Hover the dev-squad row to draw the eye to it.
    const devSquadCell = page.locator('text=/^dev-squad$/').first();
    await devSquadCell.hover().catch(() => {});
    await slide('hover dev-squad', 1500);

    // 2. Navigate directly to the dev-squad-cli console logs (which is the
    //    Terminal page because the executable has WithTerminal()).
    console.log('[step 2] opening dev-squad-cli terminal page…');
    const dashboardOrigin = new URL(loginUrl).origin;
    await page.goto(`${dashboardOrigin}/consolelogs/resource/dev-squad-cli`, {
        waitUntil: 'domcontentloaded',
    });
    await page.waitForSelector('text=Terminal', { timeout: 15000 });
    await slide('Terminal page loaded for dev-squad-cli', 2500);

    // 3. Click "Take control" to claim the PTY input. It's a fluent-button,
    //    so click via JS to be reliable across the shadow-DOM boundary.
    console.log('[step 3] taking control of the PTY…');
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('fluent-button'));
        const take = btns.find(b => (b.innerText || b.textContent || '').trim() === 'Take control');
        if (!take) throw new Error('Take control button not found');
        take.click();
    });
    await slide('Took control — primary input owned by this tab', 2000);

    // 4. Focus the xterm textarea + handle Copilot CLI startup dialogs.
    console.log('[step 4] handling Copilot CLI startup + typing prompt…');
    const focused = await page.evaluate(() => {
        const helper = document.querySelector('.xterm-helper-textarea');
        if (helper) { helper.focus(); return true; }
        return false;
    });
    if (!focused) throw new Error('xterm helper textarea not found');
    await slow(800);

    // The first time the Copilot CLI launches in a folder, it shows a
    //   "Confirm folder trust: Do you trust the files in this folder? 1. Yes …"
    // dialog. The default selection is "Yes" so a single Enter accepts it.
    // We poll the screen text for that prompt, press Enter once it appears,
    // and then proceed to typing our prompt.
    const xtermText = async () => page.evaluate(() => {
        const rows = document.querySelectorAll('.xterm-rows > div');
        return Array.from(rows).map(r => r.textContent || '').join('\n');
    });

    await slide('waiting for Copilot CLI banner / trust dialog', 4000);

    // Wait up to 30s for either the trust dialog OR a "type ahead" prompt to render.
    const trustDeadline = Date.now() + 30_000;
    let sawTrust = false;
    while (Date.now() < trustDeadline) {
        const t = await xtermText();
        if (/Confirm folder trust|Do you trust|trust the files/i.test(t)) {
            sawTrust = true;
            console.log('[step 4]   trust dialog detected — pressing Enter to accept');
            break;
        }
        if (/commands|help|tab next tab/i.test(t)) {
            console.log('[step 4]   prompt already ready, no trust dialog');
            break;
        }
        await slow(800);
    }
    if (sawTrust) {
        await page.keyboard.press('Enter');
        await slide('approved folder trust', 2500);
    }

    // Once the prompt is ready, the bottom-of-screen status bar shows
    // "Squad · Claude … · 1M context" etc. Wait briefly for it to settle.
    await slow(1500);

    // Type the prompt character-by-character so the cursor advances on camera.
    const prompt = 'show me the team';
    console.log(`[step 4]   typing prompt: "${prompt}"`);
    for (const ch of prompt) {
        await page.keyboard.type(ch, { delay: 60 });
    }
    await slide('prompt typed, about to submit', 1200);
    await page.keyboard.press('Enter');

    // 5. Wait for the coordinator's response to fill the screen. The Copilot
    //    CLI streams tokens; give it a generous 90s budget for the network
    //    roundtrip + dispatching the response.
    console.log('[step 5] waiting for response to render…');
    await slide('waiting for Copilot to respond…', 3000);

    // Poll the xterm DOM for new text past a baseline and hold once we see
    // either roster-shaped output OR a long-enough quiet period after streaming.
    let baseline = '';
    let lastText = '';
    let quietTicks = 0;
    const totalDeadlineMs = 120_000;
    const tickMs = 1500;
    const start = Date.now();
    while (Date.now() - start < totalDeadlineMs) {
        const text = await page.evaluate(() => {
            const rows = document.querySelectorAll('.xterm-rows > div');
            return Array.from(rows).map(r => r.textContent || '').join('\n');
        });
        if (baseline === '') {
            baseline = text;
        }
        // Heuristic 1: did we see roster-style markers?
        const rosterMatches = /Lisa|Marge|Frink|Comic Book Guy|Tech Lead|Frontend|Backend|Tester|Coordinator/i.test(text);
        // Heuristic 2: response has stopped streaming (text unchanged for ~6 ticks).
        if (text === lastText && text !== baseline) {
            quietTicks++;
        } else {
            quietTicks = 0;
        }
        lastText = text;
        if (rosterMatches && quietTicks >= 3) {
            console.log('[step 5] response is roster-shaped and quiet — done.');
            break;
        }
        if (quietTicks >= 8) {
            console.log('[step 5] response is quiet (no roster match) — done.');
            break;
        }
        await slow(tickMs);
    }

    // 6. Hold so the viewer can read the result.
    await slide('hold final frame on coordinator response', 6000);

    console.log('[done] closing page and saving video…');
} catch (err) {
    console.error('[error]', err);
    // Take a debug screenshot so we can see what went wrong even if video fails.
    await page.screenshot({ path: path.join(outDir, 'error.png'), fullPage: true }).catch(() => {});
    throw err;
} finally {
    await page.close();
    await context.close();
    await browser.close();
}

console.log(`Video saved under: ${outDir}`);
