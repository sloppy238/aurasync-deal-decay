import { expect, test } from "@playwright/test";

const paths = ["/", "/drift", "/command-center", "/signal-lab", "/relationship-graph", "/review-room", "/deals", "/deals/deal-nimbus", "/integrations", "/governance"];

function relativeLuminance(rgb: string) {
  const values = rgb.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [0, 0, 0];
  const linear = values.map(value => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground: string, background: string) {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test.describe("AuraSync accessibility and interaction QA", () => {
  for (const path of paths) {
    test(`${path} has a semantic page title and named controls`, async ({ page }) => {
      await page.goto(`http://127.0.0.1:3000${path}`);
      await page.waitForLoadState("networkidle");

      await expect(page.locator("h1")).toHaveCount(1);
      const unnamed = await page.locator("button, input, [role='button'], a[href]").evaluateAll(elements =>
        elements.filter(element => {
          const html = element as HTMLElement;
          const input = element as HTMLInputElement;
          const name = html.innerText?.trim() || html.getAttribute("aria-label") || html.getAttribute("title") || input.placeholder;
          return !name;
        }).length,
      );
      expect(unnamed).toBe(0);

      await page.keyboard.press("Tab");
      const focusIsVisible = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement | null;
        if (!element || element === document.body) return false;
        const style = getComputedStyle(element);
        return style.outlineStyle !== "none" || style.boxShadow !== "none";
      });
      expect(focusIsVisible).toBe(true);
    });
  }

  test("Drift keeps chosen reminders local and records a manual check-in", async ({ page }) => {
    await page.goto("http://127.0.0.1:3000/drift");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Add the first person" }).click();
    await page.getByLabel("Name").fill("Maya");
    await page.getByLabel("Remind me on (optional)").fill(new Date().toLocaleDateString("en-CA"));
    await page.getByRole("button", { name: "Add to my list" }).click();

    await expect(page.getByRole("heading", { name: "Maya" })).toBeVisible();
    await expect(page.getByText("You planned a check-in for", { exact: false })).toBeVisible();
    const saved = await page.evaluate(() => localStorage.getItem("drift.relationships.v1"));
    expect(saved).toContain("Maya");

    await page.getByRole("button", { name: "I checked in" }).click();
    await expect(page.getByText("Check-in with Maya recorded. No next reminder is set.")).toBeVisible();
    await page.reload();
    await expect(page.getByText("No reminder planned")).toBeVisible();
    await expect(page.getByText("Last check-in Today")).toBeVisible();
  });

  test("key text samples meet readable contrast", async ({ page }) => {
    await page.goto("http://127.0.0.1:3000/governance");
    await page.waitForLoadState("networkidle");
    const samples = await page.locator("h1, header p, main h2, main h3").evaluateAll(elements => {
      const toRgb = (color: string) => {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const context = canvas.getContext("2d");
        if (!context) return color;
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
        return `rgb(${red}, ${green}, ${blue})`;
      };

      return elements.slice(0, 12).map(element => {
        const foreground = toRgb(getComputedStyle(element).color);
        let node: Element | null = element;
        let background = "rgb(255, 255, 255)";
        while (node) {
          const candidate = getComputedStyle(node).backgroundColor;
          if (!candidate.endsWith(", 0)") && candidate !== "rgba(0, 0, 0, 0)") {
            background = toRgb(candidate);
            break;
          }
          node = node.parentElement;
        }
        return { text: element.textContent?.trim().slice(0, 80), foreground, background };
      });
    });
    samples.forEach(sample =>
      expect(
        contrastRatio(sample.foreground, sample.background),
        `${sample.text}: ${sample.foreground} on ${sample.background}`,
      ).toBeGreaterThanOrEqual(4.5),
    );
  });

  test("deal search, filters, sorting, and route transitions work", async ({ page }) => {
    await page.goto("http://127.0.0.1:3000/deals");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Search deals").fill("Nimbus");
    await expect(page.getByRole("button", { name: "Decay score 88 out of 100" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Decay score 77 out of 100" })).toHaveCount(0);

    await page.getByLabel("Search deals").fill("");
    await page.getByRole("button", { name: "Healthy" }).click();
    await expect(page.getByRole("button", { name: "Decay score 30 out of 100" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Decay score 88 out of 100" })).toHaveCount(0);

    await page.getByRole("button", { name: /Risk high–low/ }).click();
    await page.getByRole("button", { name: "All deals" }).click();
    await page.getByRole("button", { name: /Lumen Energy/ }).click();
    await expect(page).toHaveURL(/\/deals\/deal-lumen$/);
    await expect(page.getByRole("heading", { name: "Lumen Energy" })).toBeVisible();
  });

  test("integration configuration dialog opens and closes with accessible labeling", async ({ page }) => {
    await page.goto("http://127.0.0.1:3000/integrations");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "View configuration" }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Gmail metadata configuration" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("executive command search opens from the keyboard and navigates", async ({ page }) => {
    await page.goto("http://127.0.0.1:3000/");
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByLabel("Search AuraSync destinations").fill("governance");
    await page.getByRole("button", { name: /Privacy & governance/ }).click();
    await expect(page).toHaveURL(/\/governance$/);
  });

  test("recommended action produces visible feedback", async ({ page }) => {
    await page.goto("http://127.0.0.1:3000/deals/deal-nimbus");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Assign intervention" }).click();
    await expect(page.getByText("Intervention assigned to the deal owner")).toBeVisible();
  });

  test("command center can disposition a prioritized action", async ({ page }) => {
    await page.goto("http://127.0.0.1:3000/command-center");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Mark done" }).first().click();
    await expect(page.getByRole("button", { name: "Done" }).first()).toBeVisible();
    await expect(page.getByText("Action marked complete")).toBeVisible();
  });

  test("signal lab updates a local scenario", async ({ page }) => {
    await page.goto("http://127.0.0.1:3000/signal-lab");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("slider")).toHaveCount(4);
    await page.getByRole("button", { name: "Cedar Financial" }).click();
    await page.getByRole("slider").first().press("ArrowRight");
    await expect(page.getByText("Local scenario only. No deal record was changed.")).toBeVisible();
  });

  test("review room records a control acknowledgement", async ({ page }) => {
    await page.goto("http://127.0.0.1:3000/review-room");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /Metadata-only collection boundary confirmed/ }).click();
    await expect(page.getByText("Reviewed").first()).toBeVisible();
  });
});

test.describe("AuraSync metadata import QA", () => {
  test("downloads a source template and stages a valid Salesforce metadata file", async ({ page }) => {
    await page.goto("http://127.0.0.1:3000/integrations");
    await page.waitForLoadState("networkidle");

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download template" }).click();
    expect((await download).suggestedFilename()).toContain("aurasync-salesforce-metadata-template.csv");

    await page.locator("input[type='file']").setInputFiles({
      name: "salesforce-opportunities.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("opportunity_id,account_name,stage,amount,close_date\n006-qa,QA Account,Negotiation,100000,2026-09-30\n"),
    });
    await expect(page.getByText("Boundary check passed")).toBeVisible();
    await page.getByRole("button", { name: "Stage metadata for scoring" }).click();
    await expect(page.getByText("Metadata staged for relationship scoring.")).toBeVisible();
  });

  test("blocks Gmail files that contain message content columns", async ({ page }) => {
    await page.goto("http://127.0.0.1:3000/integrations");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Gmail file" }).click();
    await page.locator("input[type='file']").setInputFiles({
      name: "gmail-export.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("message_id,occurred_at,sender_id,subject,body\nmsg-001,2026-09-01T12:00:00Z,sender-001,blocked,blocked\n"),
    });
    await expect(page.getByText("Import blocked", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Stage metadata for scoring" })).toBeDisabled();
    await expect(page.getByText(/Blocked content-bearing columns/)).toBeVisible();
  });

  test("shows a visible local error for oversized files", async ({ page }) => {
    await page.goto("http://127.0.0.1:3000/integrations");
    await page.waitForLoadState("networkidle");
    await page.locator("input[type='file']").setInputFiles({
      name: "oversized.csv",
      mimeType: "text/csv",
      buffer: Buffer.alloc(2_000_001, "x"),
    });
    await expect(page.getByText("Import blocked", { exact: true })).toBeVisible();
    await expect(page.getByText("The file exceeds the 2 MB local import limit.")).toBeVisible();
  });
});


test.describe("AuraSync import operations QA", () => {
  test("reviews local field mapping before staging", async ({ page }) => {
    await page.goto("http://127.0.0.1:3000/integrations");
    await page.waitForLoadState("networkidle");
    await page.locator("input[type='file']").setInputFiles({
      name: "mapping-review.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("opportunity_id,opportunity_name,account_name,stage,owner_email,amount,close_date,contact_id,contact_role\n006-map,Mapping Deal,Mapping Account,Proposal,owner@example.com,200000,2026-10-01,003-map,Champion\n"),
    });
    await page.getByRole("button", { name: "Review mapping" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Review Salesforce metadata mapping" })).toBeVisible();
    await expect(page.getByText("Mapping Account")).toBeVisible();
    await expect(page.getByText("Mapping stays in the browser and excludes content-bearing fields.")).toBeVisible();
  });

  test("shows staged run history and refresh readiness", async ({ page }) => {
    await page.goto("http://127.0.0.1:3000/integrations");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Import history")).toBeVisible();
    await expect(page.getByText("salesforce-opportunities-aug.csv")).toBeVisible();
    await page.getByRole("button", { name: "Prepare Salesforce refresh" }).click();
    await expect(page.getByText("Latest Salesforce import is ready for refresh")).toBeVisible();
  });

  test("reports local refresh deltas after a valid file is selected", async ({ page }) => {
    await page.goto("http://127.0.0.1:3000/integrations");
    await page.waitForLoadState("networkidle");
    await page.locator("input[type='file']").setInputFiles({
      name: "delta-report.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("opportunity_id,account_name,stage,amount,close_date\n006-delta,Delta Account,Negotiation,150000,2026-10-15\n"),
    });
    await expect(page.getByText("Added", { exact: true })).toBeVisible();
    await expect(page.getByText("Changed", { exact: true })).toBeVisible();
    await expect(page.getByText("Removed", { exact: true })).toBeVisible();
    await expect(page.getByText("Unchanged", { exact: true })).toBeVisible();
  });
});
