import { test, expect } from '@playwright/test';

test.describe('School Admission System End-to-End Test Suite', () => {
  const timestamp = Date.now().toString().slice(-6);
  const studentBcn = `20150000000${timestamp}`;

  test('complete admission journey: admin class creation -> zero seat warning -> student hold -> confirm -> duplicate blocking', async ({
    page,
  }) => {
    // 1. Visit Admin Portal
    await page.goto('/admin');
    await expect(page.locator('h1')).toContainText(/ভর্তি প্রশাসন প্যানেল|Admission Administration/);

    // 2. Open Add Class Modal
    await page.click("button:has-text('নতুন শ্রেণি যোগ করুন'), button:has-text('Add class')");
    await expect(page.locator("h2:has-text('নতুন শ্রেণি যোগ করুন'), h2:has-text('Add New Class')")).toBeVisible();

    // 3. Test Zero Available Seats Warning
    const availableSeatsInput = page.locator("input[placeholder*='প্রাথমিক খালি আসন'], input[placeholder*='Initial seats available']");
    await availableSeatsInput.fill('0');
    await page.click("button:has-text('শ্রেণি তৈরি করুন'), button:has-text('Create Class')");

    // Warning dialog must appear
    await expect(
      page.locator("h4:has-text('কোনো আসন খালি নেই সতর্কবার্তা'), h4:has-text('Zero Available Seats Warning')")
    ).toBeVisible();

    // Cancel warning
    await page.click("button:has-text('বাতিল'), button:has-text('Cancel')");

    // 4. Create valid class with 20 seats
    await page.locator("input[placeholder*='১ থেকে ১২০'], input[placeholder*='Choose between 1 to 120']").fill('20');
    await availableSeatsInput.fill('20');
    await page.click("button:has-text('শ্রেণি তৈরি করুন'), button:has-text('Create Class')");

    // Wait for modal to close and class to appear in table
    await expect(page.locator('table.data')).toContainText('Class 6');

    // 5. Navigate to Student Portal
    await page.goto('/');
    await expect(page.locator('table.data')).toContainText('Class 6');

    // 6. Attempt booking without BCN -> alert shows
    const applyButton = page.locator("button:has-text('আবেদন করুন'), button:has-text('Apply for a seat')").first();
    await applyButton.click();
    await expect(
      page.locator("h3:has-text('আবেদন সম্পর্কিত নোটিশ'), h3:has-text('Application Notice')")
    ).toBeVisible();

    // 7. Enter 17-digit student BCN in banner
    const bcnInput = page.locator("input[placeholder*='১৭ ডিজিটের জন্ম নিবন্ধন নম্বর'], input[placeholder*='Enter 17-digit birth certificate number']");
    await bcnInput.fill(studentBcn);
    await page.click("button:has-text('দাখিল করুন'), button:has-text('Set BCN')");

    // Masked BCN banner must appear
    await expect(page.locator("text=2015*********")).toBeVisible();

    // 8. Book a seat hold
    await applyButton.click();

    // 9. Countdown screen
    await expect(page).toHaveURL(/.*\/applications\/.*/);
    await expect(
      page.locator("h1:has-text('সাময়িক আসন সংরক্ষিত হয়েছে'), h1:has-text('Seat Temporarily Reserved')")
    ).toBeVisible();
    await expect(page.locator('.font-extrabold')).toBeVisible();

    // 10. Confirm seat
    await page.click("button:has-text('আসন নিশ্চিত করুন'), button:has-text('Confirm Seat')");

    // Confirmed state
    await expect(
      page.locator("h1:has-text('ভর্তি নিশ্চিতকরণ সফল হয়েছে!'), h1:has-text('Admission Application Confirmed!')")
    ).toBeVisible();

    // 11. Return to home and attempt duplicate booking -> must be blocked
    await page.goto('/');
    await applyButton.click();
    await expect(
      page.locator("p:has-text('already have a confirmed admission'), p:has-text('ইতিমধ্যে নিশ্চিত করা হয়েছে')")
    ).toBeVisible();

    // 12. Check My Applications
    await page.goto('/my-applications');
    await expect(page.locator('table.data')).toContainText('Class 6');
    await expect(page.locator('table.data')).toContainText(/নিশ্চিত|CONFIRMED/);
  });
});
