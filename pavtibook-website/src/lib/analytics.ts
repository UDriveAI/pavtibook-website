"use client";

/**
 * Reusable Google Analytics Event Tracking Helpers
 * Standardizes event names for GA4 reports
 */

export function trackEvent(eventName: string, params: Record<string, unknown> = {}) {
  if (typeof window !== "undefined" && (window as unknown as { gtag: (...args: unknown[]) => void }).gtag) {
    (window as unknown as { gtag: (...args: unknown[]) => void }).gtag("event", eventName, {
      ...params,
      platform: "web",
      page_path: window.location.pathname,
    });
  }
}

export function trackDemoRequest(orgName: string, orgType: string) {
  trackEvent("demo_request_submit", {
    organization_name: orgName,
    organization_type: orgType,
  });
}

export function trackContactSubmit() {
  trackEvent("contact_submit");
}

export function trackDownloadInterest(orgName: string) {
  trackEvent("download_interest", {
    organization_name: orgName,
  });
}

export function trackPricingView(billingPeriod: string) {
  trackEvent("pricing_view", {
    billing_period: billingPeriod,
  });
}

export function trackWhatsAppClick(location: string) {
  trackEvent("whatsapp_click", {
    click_location: location,
  });
}
