// @ts-check
const { test, expect } = require('@playwright/test');

const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
const TABLET = { viewport: { width: 768, height: 1024 } };
const DESKTOP = { viewport: { width: 1280, height: 800 } };
const WIDTHS = [375, 390, 430, 768, 1024, 1280, 1440];

// Everything that would show up red in DevTools, including CSP violations
async function watchForProblems(page) {
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`requestfailed: ${r.url()}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`); });
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      console.error(`CSP violation: ${e.violatedDirective} ${e.blockedURI}`);
    });
  });
  return problems;
}

// WCAG contrast ratio of two opaque computed colors, e.g. "rgb(0, 102, 204)"
function contrast(a, b) {
  const luminance = (color) => {
    const [r, g, bl] = (color.match(/[\d.]+/g) || []).slice(0, 3).map((v) => {
      const c = Number(v) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

async function waitForScrollEnd(page) {
  await expect.poll(async () => {
    const a = await page.evaluate(() => window.scrollY);
    await page.waitForTimeout(120);
    return a === (await page.evaluate(() => window.scrollY));
  }).toBe(true);
}

test.describe('page health', () => {
  for (const colorScheme of /** @type {const} */ (['light', 'dark'])) {
    test(`loads without errors in ${colorScheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      const problems = await watchForProblems(page);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      expect(problems).toEqual([]);
    });
  }

  test('does not scroll by itself after load', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('has no horizontal overflow at any width', async ({ page }) => {
    await page.goto('/');
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      const result = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const offenders = [];
        for (const el of document.querySelectorAll('body *')) {
          // The wallpaper is clipped, the segmented strip scrolls on purpose, the dialog is closed
          if (el.closest('.wallpaper, dialog, script') || el.parentElement?.closest('.segmented-scroll')) continue;
          const r = el.getBoundingClientRect();
          if (r.width > 0 && (r.right > vw + 0.5 || r.left < -0.5)) {
            offenders.push(`${el.tagName.toLowerCase()}.${el.getAttribute('class') || ''} [${Math.round(r.left)}, ${Math.round(r.right)}]`);
          }
        }
        return { scrollWidth: document.documentElement.scrollWidth, vw, offenders: offenders.slice(0, 5) };
      });
      expect(result.scrollWidth, `scrollWidth at ${width}px`).toBeLessThanOrEqual(result.vw);
      expect(result.offenders, `elements past the edge at ${width}px`).toEqual([]);
    }
  });

  // One accent color: every icon tile and every accent number or label uses the same blue
  for (const colorScheme of /** @type {const} */ (['light', 'dark'])) {
    test(`icons and accent text share one color in ${colorScheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto('/');
      const distinct = (selector, property) => page.$$eval(selector, (els, prop) =>
        [...new Set(els.map((el) => getComputedStyle(el).getPropertyValue(prop)))], property);
      expect(await distinct('.icon', 'background-color')).toHaveLength(1);
      expect(await distinct('.widget .num, .project .eyebrow, .metric b, .outcome .label', 'color')).toHaveLength(1);
    });

    // The selected skill area has to be obvious, or the other segments don't read as clickable
    test(`the selected skill tab stands out in ${colorScheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto('/');
      const { pill, card, label } = await page.evaluate(() => {
        const seg = document.getElementById('segmented');
        return {
          pill: getComputedStyle(seg, '::before').backgroundColor,
          card: getComputedStyle(document.querySelector('.skills-panel')).backgroundColor,
          label: getComputedStyle(seg.querySelector('[aria-selected="true"]')).color,
        };
      });
      expect(pill, 'selected pill blends into the cards').not.toBe(card);
      expect(contrast(label, pill), 'selected label on the pill').toBeGreaterThanOrEqual(4.5);
    });
  }
});

for (const [layout, options] of /** @type {const} */ ([['phone', PHONE], ['tablet', TABLET], ['desktop', DESKTOP]])) {
  test.describe(`${layout} layout`, () => {
    test.use(options);

    test('skip link appears on focus without covering the tab bar', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      const skip = page.getByRole('link', { name: 'Skip to main content' });
      await expect(skip).not.toBeInViewport();
      await skip.focus();
      await expect(skip).toBeInViewport({ ratio: 1 });
      const a = await skip.boundingBox();
      const b = await page.locator('#tabbar').boundingBox();
      if (!a || !b) throw new Error('skip link or tab bar not rendered');
      const overlap = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
      expect(overlap).toBe(false);
    });

    test('tab bar scrolls to each section and marks it current', async ({ page }) => {
      await page.goto('/');
      const nav = page.getByRole('navigation', { name: 'Sections' });
      const current = nav.locator('[aria-current="true"]');
      await expect(current).toHaveText('Profile');

      for (const [label, id] of [['Projects', 'projects'], ['Skills', 'skills'], ['Contact', 'contact'], ['Profile', 'profile']]) {
        await nav.getByRole('link', { name: label }).click();
        await expect(current).toHaveText(label);
        await waitForScrollEnd(page);
        const position = await page.evaluate((sectionId) => {
          const html = document.documentElement;
          return {
            top: document.getElementById(sectionId).getBoundingClientRect().top,
            padding: parseFloat(getComputedStyle(html).scrollPaddingTop),
            atTop: window.scrollY === 0,
            atBottom: window.innerHeight + window.scrollY >= html.scrollHeight - 2,
          };
        }, id);
        const aligned = Math.abs(position.top - position.padding) < 4 || position.atTop || position.atBottom;
        expect(aligned, `${label} section is scrolled into place`).toBe(true);
        await expect(current).toHaveText(label);
        await expect(nav.locator('[aria-current]')).toHaveCount(1);
      }
    });

    test('tab bar stays docked while the page scrolls', async ({ page }) => {
      await page.goto('/');
      const bar = page.locator('#tabbar');
      // phone: gap to the bottom edge; tablet and up: gap to the top edge
      const gap = async () => {
        const box = await bar.boundingBox();
        if (!box) throw new Error('tab bar not rendered');
        return layout === 'phone' ? options.viewport.height - (box.y + box.height) : box.y;
      };
      const atTop = await gap();
      expect(atTop).toBeGreaterThanOrEqual(0);
      expect(atTop).toBeLessThan(40);
      await page.evaluate(() => window.scrollTo({ top: 1200, behavior: 'instant' }));
      await expect(page.locator('#navbar')).toHaveClass(/scrolled/);
      expect(Math.abs((await gap()) - atTop)).toBeLessThan(1);
    });

    test('scroll-spy follows manual scrolling', async ({ page }) => {
      await page.goto('/');
      const current = page.locator('#tabbar [aria-current="true"]');
      await page.evaluate(() => document.getElementById('projects').scrollIntoView({ behavior: 'instant' }));
      await expect(current).toHaveText('Projects');
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
      await expect(current).toHaveText('Contact');
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await expect(current).toHaveText('Profile');
    });

    test('segmented control switches skill panels by mouse and keyboard', async ({ page }) => {
      await page.goto('/');
      const tablist = page.getByRole('tablist', { name: 'Skill areas' });
      const tab = (name) => tablist.getByRole('tab', { name, exact: true });
      const visiblePanels = page.locator('[role="tabpanel"]:visible');

      await expect(tablist.getByRole('tab')).toHaveCount(6);
      await expect(visiblePanels).toHaveCount(1);
      await expect(page.locator('#panel-aws')).toBeVisible();

      await tab('Kubernetes').click();
      await expect(tab('Kubernetes')).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('#panel-k8s')).toBeVisible();
      await expect(visiblePanels).toHaveCount(1);

      await tab('Kubernetes').focus();
      await page.keyboard.press('ArrowRight');
      await expect(tab('IaC & CI/CD')).toBeFocused();
      await expect(page.locator('#panel-iac')).toBeVisible();
      await page.keyboard.press('End');
      await expect(tab('Scripting & AI')).toHaveAttribute('aria-selected', 'true');
      await page.keyboard.press('ArrowRight');
      await expect(tab('AWS')).toBeFocused();
      await page.keyboard.press('ArrowLeft');
      await expect(tab('Scripting & AI')).toBeFocused();
      await page.keyboard.press('Home');
      await expect(tab('AWS')).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('#panel-aws')).toBeVisible();
      await expect(visiblePanels).toHaveCount(1);
      await expect(page.locator('[role="tab"][tabindex="0"]')).toHaveCount(1);
    });

    test('project sheet opens and closes by button, Esc and backdrop', async ({ page }) => {
      await page.goto('/');
      const sheet = page.locator('#sheet');
      const card = page.getByRole('button', { name: 'EKS Autoscaling & Progressive Delivery' });

      const open = async () => {
        await card.click();
        await expect(page.getByRole('dialog', { name: 'EKS Autoscaling & Progressive Delivery' })).toBeVisible();
        await expect(sheet).toContainText('Node scaling driven by CloudWatch alarms');
        await expect(page.getByRole('heading', { name: 'EKS Autoscaling & Progressive Delivery', level: 2 })).toBeFocused();
        await expect(page.locator('html')).toHaveClass(/sheet-open/);
      };
      const expectClosed = async () => {
        await expect(sheet).toBeHidden();
        await expect(card).toBeFocused();
        await expect(page.locator('html')).not.toHaveClass(/sheet-open/);
      };

      await open();
      await page.getByRole('button', { name: 'Close' }).click();
      await expectClosed();

      await open();
      await page.keyboard.press('Escape');
      await expectClosed();

      await open();
      await page.mouse.click(5, 5); // top-left corner is backdrop at every size
      await expectClosed();
    });

    test('focus stays inside the open sheet', async ({ page, browserName }) => {
      // Safari's default Tab skips buttons and links; Option+Tab reaches them
      const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
      await page.goto('/');
      await page.getByRole('button', { name: 'Monitoring Migration & Cloud Cost Reduction' }).click();
      await expect(page.locator('#sheet')).toBeVisible();
      await page.keyboard.press(tab);
      await expect(page.getByRole('button', { name: 'Close' })).toBeFocused();
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press(tab);
        const inside = await page.evaluate(() => {
          const el = document.activeElement;
          return el === document.body || !!el?.closest('#sheet');
        });
        expect(inside).toBe(true);
      }
    });
  });
}

test.describe('phone gestures', () => {
  test.use(PHONE);

  async function openSheetAndSwipe(page, distance) {
    await page.goto('/');
    await page.getByRole('button', { name: '3-Tier Service Review System on AWS' }).click();
    const sheet = page.locator('#sheet');
    await expect(sheet).toBeVisible();
    await page.waitForFunction(() => getComputedStyle(document.getElementById('sheet')).transform === 'none');
    const box = await page.locator('.sheet-head').boundingBox();
    if (!box) throw new Error('sheet header not rendered');
    const cdp = await page.context().newCDPSession(page);
    const x = box.x + 40, y = box.y + 10;
    const touch = (type, dy = 0) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y: y + dy }] });
    await touch('touchStart');
    for (let d = 10; d <= distance; d += 10) await touch('touchMove', d);
    await touch('touchEnd');
    return sheet;
  }

  test('swiping the sheet down far enough dismisses it', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'touch input is driven through the Chrome DevTools Protocol');
    const sheet = await openSheetAndSwipe(page, 220);
    await expect(sheet).toBeHidden();
  });

  test('a short swipe springs the sheet back', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'touch input is driven through the Chrome DevTools Protocol');
    const sheet = await openSheetAndSwipe(page, 40);
    await page.waitForTimeout(600);
    await expect(sheet).toBeVisible();
    await expect(sheet).toHaveClass(/is-open/);
  });
});

test.describe('content and links', () => {
  test('local links, hash targets and image assets all resolve', async ({ page, request }) => {
    await page.goto('/');
    const hrefs = await page.$$eval('a[href]', (links) => links.map((a) => a.getAttribute('href') || ''));
    const local = [...new Set(hrefs.filter((h) => !/^(https?:|mailto:|#)/.test(h)))];
    const hashes = [...new Set(hrefs.filter((h) => h.startsWith('#')))];
    expect(local).toContain('resume/TimurDjigkaevDevopsCV.pdf');
    for (const href of local) expect((await request.get(href)).status(), href).toBe(200);
    for (const hash of hashes) expect(await page.locator(hash).count(), hash).toBe(1);

    const assets = await page.evaluate(() => [
      ...[...document.querySelectorAll('img[src]')].map((i) => i.getAttribute('src')),
      ...[...document.querySelectorAll('[srcset]')].flatMap((s) =>
        (s.getAttribute('srcset') || '').split(',').map((c) => c.trim().split(' ')[0])),
      ...[...document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]')].map((l) => l.getAttribute('href')),
    ]);
    for (const asset of new Set(assets)) expect((await request.get(asset || '')).status(), asset || '').toBe(200);
    await expect(page.locator('a[download]')).toHaveAttribute('href', 'resume/TimurDjigkaevDevopsCV.pdf');
  });

  test('external links go to the expected profiles and open safely', async ({ page }) => {
    await page.goto('/');
    const external = await page.$$eval('a[href^="http"]', (links) =>
      links.map((a) => ({ href: a.href, target: a.target, rel: a.rel })));
    expect([...new Set(external.map((l) => l.href))].sort()).toEqual([
      'https://github.com/dzhigkaev',
      'https://t.me/Djigkaev',
      'https://www.credly.com/users/timur-dzhigkaev/badges#credly',
      'https://www.linkedin.com/in/djigkaev',
    ]);
    for (const link of external) {
      expect(link.target, link.href).toBe('_blank');
      expect(link.rel, link.href).toContain('noopener');
    }
    const mail = await page.$$eval('a[href^="mailto:"]', (links) => [...new Set(links.map((a) => a.getAttribute('href')))]);
    expect(mail).toEqual(['mailto:timur.djigkaev@gmail.com']);
  });

  test('Get in Touch lists Telegram', async ({ page }) => {
    await page.goto('/');
    const telegram = page.locator('#contact').getByRole('link', { name: /Telegram/ });
    await expect(telegram).toHaveAttribute('href', 'https://t.me/Djigkaev');
    await expect(telegram).toContainText('@Djigkaev');
  });

  test('serves robots.txt and sitemap.xml', async ({ request }) => {
    const robots = await request.get('robots.txt');
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain('Sitemap: https://alaniacloud.com/sitemap.xml');
    const sitemap = await request.get('sitemap.xml');
    expect(sitemap.status()).toBe(200);
    expect(sitemap.headers()['content-type']).toContain('xml');
    expect(await sitemap.text()).toContain('<loc>https://alaniacloud.com/</loc>');
  });

  test('keeps the profile facts from the previous site', async ({ page }) => {
    await page.goto('/');
    const text = await page.locator('body').innerText();
    for (const fact of [
      'DevOps & Platform Engineer', '5+', 'Years in Production', '30%', 'Cloud Cost Reduction', '50%', 'Faster Deployments',
      'Platform & DevOps Engineering', 'Security & Observability', 'AI-Assisted Engineering',
      'EKS Autoscaling & Progressive Delivery', '3-Tier Service Review System on AWS', 'Monitoring Migration & Cloud Cost Reduction',
      'CKAD: Certified Kubernetes Application Developer', 'HashiCorp Certified: Terraform Associate (003)',
      'AWS Certified Solutions Architect - Associate', '© 2026 Timur Djigkaev. All rights reserved.',
    ]) expect(text, fact).toContain(fact);
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('case studies and every skill group stay readable', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByText('Node scaling driven by CloudWatch alarms')).toBeVisible();
      await expect(page.locator('[role="tabpanel"]:visible')).toHaveCount(6);
    });
  });
});
