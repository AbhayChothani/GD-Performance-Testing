import asyncio
import json
import re
import sys
import time
import base64
from playwright.async_api import async_playwright

async def audit(target_url: str):
    start = time.time()
    result = {
        "success": False,
        "url": target_url,
        "pageName": "Home page",
        "mobile": {
            "performance": 0,
            "accessibility": 0,
            "bestPractices": 0,
            "seo": 0,
            "totalBlockingTime": 0,
            "reportUrl": "",
            "screenshotData": None
        },
        "desktop": {
            "performance": 0,
            "accessibility": 0,
            "bestPractices": 0,
            "seo": 0,
            "totalBlockingTime": 0,
            "reportUrl": "",
            "screenshotData": None
        }
    }

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            executable_path="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage"
            ]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 900}
        )
        page = await context.new_page()

        encoded = target_url.replace(":", "%3A").replace("/", "%2F")
        init_url = f"https://pagespeed.web.dev/analysis?url={encoded}&form_factor=mobile"
        
        try:
            await page.goto(init_url, wait_until="commit", timeout=60000)

            # Wait for Google analysis to complete and gauges to be ready
            gauges_ready = False
            for _ in range(40):
                await asyncio.sleep(2)
                gauges_ready = await page.evaluate('''() => {
                    const gauges = Array.from(document.querySelectorAll(".lh-gauge__percentage"));
                    const visible = gauges.filter(g => {
                        const r = g.getBoundingClientRect();
                        return r.width > 0 && r.height > 0 && window.getComputedStyle(g).display !== 'none' && g.innerText.trim().length > 0;
                    });
                    return visible.length >= 4;
                }''')
                if gauges_ready:
                    break

            if not gauges_ready:
                raise Exception("Mobile audit failed: PageSpeed gauges never appeared")

            await asyncio.sleep(2)
            analyzed_mobile_url = page.url

            # --- EXTRACT MOBILE SCORES ---
            m_scores = await page.evaluate('''() => {
                const gauges = Array.from(document.querySelectorAll(".lh-gauge__percentage"));
                const visible = gauges.filter(g => {
                    const r = g.getBoundingClientRect();
                    return r.width > 0 && r.height > 0 && window.getComputedStyle(g).display !== 'none' && g.innerText.trim().length > 0;
                });
                return visible.slice(0, 4).map(g => parseInt(g.innerText.trim()) || 0);
            }''')

            while len(m_scores) < 4:
                m_scores.append(0)

            # Mobile TBT (Visible element only)
            m_tbt = 0
            try:
                m_tbt_text = await page.evaluate('''() => {
                    const elements = Array.from(document.querySelectorAll('*'));
                    for (let el of elements) {
                        if (el.textContent && el.textContent.trim() === 'Total Blocking Time') {
                            const r = el.getBoundingClientRect();
                            if (r.width > 0 && r.height > 0) {
                                const parent = el.closest('div') || el.parentElement;
                                return parent ? parent.innerText : '';
                            }
                        }
                    }
                    return '';
                }''')
                m_match_ms = re.search(r'(\d+[\d,]*)\s*ms', m_tbt_text)
                m_match_s = re.search(r'([\d.]+)\s*s', m_tbt_text)
                if m_match_ms:
                    m_tbt = int(m_match_ms.group(1).replace(',', ''))
                elif m_match_s:
                    m_tbt = round(float(m_match_s.group(1)) * 1000)
            except:
                pass

            # Mobile Screenshot
            m_bytes = await page.screenshot(type="jpeg", quality=75)
            m_b64 = "data:image/jpeg;base64," + base64.b64encode(m_bytes).decode('utf-8')

            # --- SWITCH TO DESKTOP TAB ---
            analyzed_desktop_url = analyzed_mobile_url.replace("form_factor=mobile", "form_factor=desktop")
            if "form_factor=" not in analyzed_desktop_url:
                analyzed_desktop_url += ("&" if "?" in analyzed_desktop_url else "?") + "form_factor=desktop"

            desktop_tab = await page.query_selector("#desktop_tab, [role='tab']:has-text('Desktop'), button:has-text('Desktop')")
            if desktop_tab:
                await desktop_tab.click()

            # Wait for desktop gauges to be rendered with actual numbers
            d_ready = False
            for _ in range(25):
                await asyncio.sleep(1)
                d_ready = await page.evaluate('''() => {
                    const tab = document.querySelector("#desktop_tab");
                    if (tab && tab.getAttribute("aria-selected") !== "true") return false;
                    const gauges = Array.from(document.querySelectorAll(".lh-gauge__percentage"));
                    const visible = gauges.filter(g => {
                        const r = g.getBoundingClientRect();
                        return r.width > 0 && r.height > 0 && window.getComputedStyle(g).display !== 'none' && g.innerText.trim().length > 0;
                    });
                    return visible.length >= 4;
                }''')
                if d_ready:
                    break

            # If desktop tab click didn't yield visible gauges, navigate directly to analyzed_desktop_url
            if not d_ready and "analysis/" in analyzed_desktop_url:
                try:
                    await page.goto(analyzed_desktop_url, wait_until="commit", timeout=30000)
                    for _ in range(20):
                        await asyncio.sleep(1)
                        d_ready = await page.evaluate('''() => {
                            const gauges = Array.from(document.querySelectorAll(".lh-gauge__percentage"));
                            const visible = gauges.filter(g => {
                                const r = g.getBoundingClientRect();
                                return r.width > 0 && r.height > 0 && window.getComputedStyle(g).display !== 'none' && g.innerText.trim().length > 0;
                            });
                            return visible.length >= 4;
                        }''')
                        if d_ready:
                            break
                except:
                    pass

            # --- EXTRACT DESKTOP SCORES (Visible gauges only) ---
            d_scores = await page.evaluate('''() => {
                const gauges = Array.from(document.querySelectorAll(".lh-gauge__percentage"));
                const visible = gauges.filter(g => {
                    const r = g.getBoundingClientRect();
                    return r.width > 0 && r.height > 0 && window.getComputedStyle(g).display !== 'none' && g.innerText.trim().length > 0;
                });
                return visible.slice(0, 4).map(g => parseInt(g.innerText.trim()) || 0);
            }''')

            while len(d_scores) < 4:
                d_scores.append(0)

            # If desktop scores failed to extract (e.g. all 0s), fail audit so fallback applies
            if d_scores[0] == 0 and d_scores[1] == 0 and d_scores[2] == 0:
                raise Exception("Desktop audit failed: Desktop gauges were not ready (all 0s)")

            # Desktop TBT (Visible element only)
            d_tbt = 0
            try:
                d_tbt_text = await page.evaluate('''() => {
                    const elements = Array.from(document.querySelectorAll('*'));
                    for (let el of elements) {
                        if (el.textContent && el.textContent.trim() === 'Total Blocking Time') {
                            const r = el.getBoundingClientRect();
                            if (r.width > 0 && r.height > 0) {
                                const parent = el.closest('div') || el.parentElement;
                                return parent ? parent.innerText : '';
                            }
                        }
                    }
                    return '';
                }''')
                d_match_ms = re.search(r'(\d+[\d,]*)\s*ms', d_tbt_text)
                d_match_s = re.search(r'([\d.]+)\s*s', d_tbt_text)
                if d_match_ms:
                    d_tbt = int(d_match_ms.group(1).replace(',', ''))
                elif d_match_s:
                    d_tbt = round(float(d_match_s.group(1)) * 1000)
            except:
                pass

            # Desktop Screenshot
            d_bytes = await page.screenshot(type="jpeg", quality=75)
            d_b64 = "data:image/jpeg;base64," + base64.b64encode(d_bytes).decode('utf-8')

            # Page Name derivation
            cleaned_name = "Home page"
            try:
                parsed_path = target_url.split("//", 1)[-1].split("/", 1)[-1].rstrip('/')
                if parsed_path:
                    cleaned_name = parsed_path.replace("-", " ").replace("_", " ").title()
            except:
                pass

            result = {
                "success": True,
                "url": target_url,
                "pageName": cleaned_name,
                "elapsed": round(time.time() - start, 1),
                "mobile": {
                    "performance": m_scores[0],
                    "accessibility": m_scores[1],
                    "bestPractices": m_scores[2],
                    "seo": m_scores[3],
                    "totalBlockingTime": m_tbt,
                    "reportUrl": analyzed_mobile_url,
                    "screenshotData": m_b64
                },
                "desktop": {
                    "performance": d_scores[0],
                    "accessibility": d_scores[1],
                    "bestPractices": d_scores[2],
                    "seo": d_scores[3],
                    "totalBlockingTime": d_tbt,
                    "reportUrl": analyzed_desktop_url,
                    "screenshotData": d_b64
                }
            }
        except Exception as ex:
            result["error"] = str(ex)
        finally:
            await browser.close()

    return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Target URL required"}))
        sys.exit(1)

    url_arg = sys.argv[1]
    out_file = sys.argv[2] if len(sys.argv) > 2 else "current_run_output.json"
    res = asyncio.run(audit(url_arg))
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(res, f)

    summary = {
        "success": res.get("success", False),
        "url": res.get("url"),
        "pageName": res.get("pageName"),
        "error": res.get("error"),
        "mobile": {k: v for k, v in res.get("mobile", {}).items() if k != "screenshotData"},
        "desktop": {k: v for k, v in res.get("desktop", {}).items() if k != "screenshotData"}
    }
    print("AUDIT_RESULT=" + json.dumps(summary))
