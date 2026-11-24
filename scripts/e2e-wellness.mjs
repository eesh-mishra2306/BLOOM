// Mood check-in, goals, breathing and journal, end to end in Chrome.
import { base, launch, signUpAndOnboard } from "./lib-session.mjs";

const { browser, page, errors } = await launch();
const shot = (n) => page.screenshot({ path: `/tmp/shots/${n}.png`, fullPage: true });
try {
  await signUpAndOnboard(page);
  await page.goto(`${base}/wellness`);
  await page.getByRole("radio", { name: "Low", exact: true }).click();
  await page.getByRole("button", { name: "Stressed" }).click();
  await page.getByLabel("Anything on your mind? (optional)").fill("Exams next week and I can't sleep");
  await page.getByRole("button", { name: "Save check-in" }).click();
  await page.getByText("Thanks for checking in.").waitFor();
  console.log("mood saved:", await page.getByRole("status").filter({ hasText: "Thanks" }).innerText());

  await page.getByRole("button", { name: "Stretch for five minutes" }).click();
  await page.getByRole("button", { name: "Mark Stretch for five minutes done today" }).click();
  await page.getByText("Done 1 time so far").waitFor();
  console.log("goal done today:", await page.getByRole("button", { name: /Stretch for five minutes: done today/ }).count());

  await page.getByRole("button", { name: "Start" }).click();
  await page.waitForTimeout(1500);
  await shot("wellness");
  console.log("breathing:", await page.locator("#breathe").getByText(/Breathe in|Breathe out/).first().innerText());
  await page.getByRole("button", { name: /Pause/ }).click();

  await page.getByRole("link", { name: "Write about it" }).click();
  await page.waitForURL("**/journal?prompt=**");
  await page.getByLabel("Title (optional)").fill("Exam week");
  await page.getByLabel("Your entry").fill("Revised two chapters. Called Didi, felt lighter after.");
  await page.getByRole("radio", { name: "Okay", exact: true }).click();
  await page.getByRole("button", { name: "Save entry" }).click();
  await page.getByRole("heading", { name: "Exam week" }).waitFor();
  await page.getByLabel("Search your journal").fill("didi");
  await page.getByLabel("Search your journal").press("Enter");
  await page.waitForURL("**/journal?q=didi");
  console.log("search heading:", await page.getByRole("heading", { level: 2, name: /mentioning/ }).innerText());
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Your entry").last().fill("Revised two chapters. Called Didi, felt much lighter after.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByText("felt much lighter").waitFor();
  const dl = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Download all entries" }).click()]);
  console.log("download:", dl[0].suggestedFilename());
  await page.goto(`${base}/journal`, { waitUntil: "networkidle" });
  await shot("journal");
} finally {
  console.log("page errors:", errors.length ? errors : "none");
  await browser.close();
}
