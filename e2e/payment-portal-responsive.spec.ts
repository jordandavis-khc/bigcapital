import { expect, test, type Page } from '@playwright/test';

test.use({ storageState: undefined });

const fixturePaymentLinkId = 'mobile-layout-regression-fixture';
const fixtureResponse = {
  data: {
    dueAmount: 125,
    dueAmountFormatted: '$125.00',
    dueDate: '2026-12-01',
    dueDateFormatted: 'Dec 1, 2026',
    invoiceDateFormatted: 'Nov 1, 2026',
    invoiceNo: 'MOBILE-FIXTURE',
    paymentAmount: 0,
    paymentAmountFormatted: '$0.00',
    subtotal: 125,
    subtotalFormatted: '$125.00',
    subtotalLocalFormatted: '$125.00',
    total: 125,
    totalFormatted: '$125.00',
    totalLocalFormatted: '$125.00',
    customerName: 'Responsive Layout Test',
    invoiceMessage: '',
    termsConditions: '',
    entries: [],
    taxes: [],
    brandingTemplate: { primaryColor: '#0052cc', companyLogoUri: '' },
    organization: {
      name: 'Halifax Test Organization',
      addressTextFormatted: 'Test address',
    },
    hasStripePaymentMethod: true,
    isReceivable: true,
    formattedCustomerAddress: '',
  },
};

async function openFixturePaymentPage(page: Page) {
  await page.route(
    `**/api/payment-links/${fixturePaymentLinkId}/invoice`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureResponse),
      }),
  );
  await page.goto(`/payment/${fixturePaymentLinkId}`);
  await expect(page.getByRole('button', { name: 'Pay $125.00' })).toBeVisible();
}

test.describe('public invoice payment responsive layout', () => {
  test('fits the invoice and pay button within mobile and tablet viewports', async ({
    page,
  }) => {
    for (const width of [360, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await openFixturePaymentPage(page);

      const geometry = await page.evaluate(() => {
        const app = document.querySelector('.App');
        const payment = document.querySelector('.App > div');
        const payButton = [...document.querySelectorAll('button')].find((button) =>
          button.textContent?.startsWith('Pay '),
        );
        const bounds = (element: Element | null) => {
          if (!element) return null;
          const { left, right, width } = element.getBoundingClientRect();
          return { left, right, width };
        };

        return {
          viewportWidth: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          app: bounds(app),
          payment: bounds(payment),
          payButton: bounds(payButton ?? null),
        };
      });

      expect(geometry.documentWidth, `document width at ${width}px`).toBeLessThanOrEqual(
        geometry.viewportWidth,
      );
      expect(geometry.app?.width, `app width at ${width}px`).toBeLessThanOrEqual(
        geometry.viewportWidth,
      );
      expect(geometry.payment?.left, `invoice left at ${width}px`).toBeGreaterThanOrEqual(0);
      expect(geometry.payment?.right, `invoice right at ${width}px`).toBeLessThanOrEqual(
        geometry.viewportWidth,
      );
      expect(geometry.payButton?.left, `pay button left at ${width}px`).toBeGreaterThanOrEqual(0);
      expect(geometry.payButton?.right, `pay button right at ${width}px`).toBeLessThanOrEqual(
        geometry.viewportWidth,
      );
      expect(geometry.payment?.width).toBe(
        width >= 632 ? 600 : width - 32,
      );
      // Intentionally do not click: this is a real payment-capable control.
    }
  });

  test('keeps the existing 1100px minimum width on non-payment app routes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const appMinWidth = await page.locator('.App').evaluate((element) =>
      getComputedStyle(element).minWidth,
    );
    expect(appMinWidth).toBe('1100px');
  });
});