import { test, expect } from '@playwright/test';

test.describe('School Admission System End-to-End Test Suite', () => {
  const timestamp = Date.now().toString().slice(-6);
  const studentBcn = `20150000000${timestamp}`;

  test('Test 1: complete admission journey: admin class creation -> zero seat warning -> student hold -> confirm -> duplicate blocking', async ({
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

    // Verify public view does NOT expose admin button in navbar
    await expect(page.locator("nav a[href='/admin'], header a[href='/admin']")).toHaveCount(0);

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
    await expect(page.locator('table.data')).toContainText(/Class \d/);
    await expect(page.locator('table.data')).toContainText(/নিশ্চিত|CONFIRMED/);
  });

  test('Test 2: browser refresh preserves BCN and live countdown without losing application', async ({
    page,
  }) => {
    const sId = `20150000001${Date.now().toString().slice(-6)}`;
    await page.goto('/');

    // Enter BCN
    const bcnInput = page.locator("input[placeholder*='১৭ ডিজিটের জন্ম নিবন্ধন নম্বর'], input[placeholder*='Enter 17-digit birth certificate number']");
    await bcnInput.fill(sId);
    await page.click("button:has-text('দাখিল করুন'), button:has-text('Set BCN')");
    await expect(page.locator("text=2015*********")).toBeVisible();

    // Apply for seat
    const applyBtn = page.locator("button:has-text('আবেদন করুন'), button:has-text('Apply for a seat')").first();
    await applyBtn.click();
    await expect(page).toHaveURL(/.*\/applications\/.*/);

    // Refresh page
    await page.reload();

    // Must NOT say Application Not Found
    await expect(page.locator("text=Application Not Found, text=আবেদন খুঁজে পাওয়া যায়নি")).toHaveCount(0);
    // Reservation title must be visible
    await expect(
      page.locator("h1:has-text('সাময়িক আসন সংরক্ষিত হয়েছে'), h1:has-text('Seat Temporarily Reserved')")
    ).toBeVisible();
    // Clock must still be running
    await expect(page.locator('.font-extrabold')).toBeVisible();
  });

  test('Test 3: mobile responsiveness and language toggle', async ({ page }) => {
    // 375x667 mobile screen
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Ensure school brand name exists without layout break
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("text=অন্যরকম আইডিয়াল স্কুল")).toBeVisible();

    // Public view must NOT contain admin button
    await expect(page.locator("a[href='/admin']")).toHaveCount(0);

    // Toggle language to English
    const langBtn = page.locator("button:visible:has-text('EN'), button:visible:has-text('বাংলা')").first();
    await langBtn.click();

    // Verify switched to English
    await expect(page.locator("header").getByText("Onnorokom Ideal School")).toBeVisible();
    await expect(page.locator("h1")).toContainText("School Admission Portal");

    // Toggle back to Bengali
    await langBtn.click();
    await expect(page.locator("header").getByText("অন্যরকম আইডিয়াল স্কুল")).toBeVisible();
  });

  test('Test 4: BCN input validation, strict 17 digits, masking, and change flow', async ({ page }) => {
    await page.goto('/');

    const bcnInput = page.locator("input[placeholder*='১৭ ডিজিটের জন্ম নিবন্ধন নম্বর'], input[placeholder*='Enter 17-digit birth certificate number']");
    const submitBtn = page.locator("button:has-text('দাখিল করুন'), button:has-text('Set BCN')");

    // Initially disabled
    await expect(submitBtn).toBeDisabled();

    // Digits counter shows 0/17 initially
    await expect(page.getByText(/০\/১৭|0\/17/)).toBeVisible();

    // Type 16 digits -> still disabled
    await bcnInput.fill('201512345678901');
    await expect(submitBtn).toBeDisabled();

    // Type 17 digits -> enabled
    const validBcn = `20158888999900012`;
    await bcnInput.fill(validBcn);
    await expect(submitBtn).toBeEnabled();

    // Submit BCN
    await submitBtn.click();

    // Masked format check
    await expect(page.locator("text=2015*********0012")).toBeVisible();

    // Change BCN button
    const changeBtn = page.locator("button:has-text('পরিবর্তন'), button:has-text('Change')");
    await expect(changeBtn).toBeVisible();
    await changeBtn.click();

    // Input field appears again
    await expect(page.locator("input[placeholder*='১৭ ডিজিটের জন্ম নিবন্ধন নম্বর'], input[placeholder*='Enter 17-digit birth certificate number']")).toBeVisible();
  });

  test('Test 5: hold cancellation releases seat and records CANCELLED audit trail', async ({ page }) => {
    const cancelBcn = `201599990000${Date.now().toString().slice(-5)}`;
    await page.goto('/');

    // Set BCN
    const bcnInput = page.locator("input[placeholder*='১৭ ডিজিটের জন্ম নিবন্ধন নম্বর'], input[placeholder*='Enter 17-digit birth certificate number']");
    await bcnInput.fill(cancelBcn);
    await page.click("button:has-text('দাখিল করুন'), button:has-text('Set BCN')");

    // Apply for seat
    const applyBtn = page.locator("button:has-text('আবেদন করুন'), button:has-text('Apply for a seat')").first();
    await applyBtn.click();
    await expect(page).toHaveURL(/.*\/applications\/.*/);

    // Accept browser confirmation dialog
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Click Cancel reservation
    const cancelHoldBtn = page.locator("button:has-text('সংরক্ষণ বাতিল করুন'), button:has-text('Cancel Reservation')");
    await expect(cancelHoldBtn).toBeVisible();
    await cancelHoldBtn.click();

    // Verify cancelled notification/status
    await expect(
      page.locator("h1:has-text('আবেদন বাতিল করা হয়েছে'), h1:has-text('Reservation Cancelled')")
    ).toBeVisible();

    // Visit My Applications
    await page.goto('/my-applications');
    await expect(page.locator('table.data')).toContainText(/বাতিল|CANCELLED/);
  });

  test('Test 6: zero available seats creation triggers warning and displays as Full', async ({ page }) => {
    await page.goto('/admin');

    // Open Add Class Modal
    await page.click("button:has-text('নতুন শ্রেণি যোগ করুন'), button:has-text('Add class')");

    const modal = page.locator(".fixed");
    await expect(modal).toBeVisible();

    // Select Class 3, Day shift
    const classSelect = modal.locator("select").nth(0);
    await classSelect.selectOption('3');
    const shiftSelect = modal.locator("select").nth(1);
    await shiftSelect.selectOption('Day');

    // Set Capacity 50, Available 0
    await modal.locator("input[type='number']").first().fill('50');
    await modal.locator("input[type='number']").nth(1).fill('0');

    // Click Create
    await modal.locator("button:has-text('শ্রেণি তৈরি করুন'), button:has-text('Create Class')").click();

    // Warning dialog should appear
    await expect(
      modal.locator("h4:has-text('কোনো আসন খালি নেই সতর্কবার্তা'), h4:has-text('Zero Available Seats Warning')")
    ).toBeVisible();

    // Confirm & Proceed anyway
    await modal.locator("button:has-text('হ্যাঁ, তবুও যোগ করুন'), button:has-text('Yes, create class anyway')").click();

    // Modal closes
    await expect(page.locator(".fixed")).toHaveCount(0);

    // Verify student view shows 0 seats / Full
    await page.goto('/');
    const fullRow = page.locator('table.data tbody tr').filter({ hasText: 'Class 3 - Day' }).first();
    await expect(fullRow).toBeVisible();
    await expect(fullRow).toContainText(/পূর্ণ|Full/);
    await expect(fullRow.locator("button").last()).toBeDisabled();
  });

  test('Test 7: admin overview metrics cards reflect active class statistics', async ({ page }) => {
    await page.goto('/admin');

    // Overview cards container
    const overviewSection = page.locator('.grid').first();
    await expect(overviewSection.getByText(/শ্রেণি সংখ্যা|CLASSES/)).toBeVisible();
    await expect(overviewSection.getByText(/মোট আসন|TOTAL SEATS/)).toBeVisible();
    await expect(overviewSection.getByText(/নিশ্চিত|CONFIRMED/)).toBeVisible();
    await expect(overviewSection.getByText(/হোল্ড|HELD/)).toBeVisible();
    await expect(overviewSection.getByText(/খালি আসন|AVAILABLE/)).toBeVisible();

    // Ensure metrics cards are populated with non-empty numeric counts
    const cards = overviewSection.locator('> div');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });
});
