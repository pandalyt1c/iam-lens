export interface AffiliatePartner {
  id: string;
  name: string;
  baseUrl: string;
  paramName?: string;
  paramValue?: string;
  disclosure: string;
}

export const PARTNERS: Record<string, AffiliatePartner> = {
  amazon: {
    id: "amazon",
    name: "Amazon",
    baseUrl: "https://www.amazon.com",
    paramName: "tag",
    paramValue: process.env.NEXT_PUBLIC_AFFILIATE_AMAZON_TAG ?? "",
    disclosure: "As an Amazon Associate, IAM Lens earns from qualifying purchases.",
  },
  aws_marketplace: {
    id: "aws_marketplace",
    name: "AWS Marketplace",
    baseUrl: "https://aws.amazon.com/marketplace",
    disclosure: "Link to AWS Marketplace. IAM Lens may receive a referral fee.",
  },
  cloud_academy: {
    id: "cloud_academy",
    name: "Cloud Academy",
    baseUrl: "https://cloudacademy.com",
    paramName: "ref",
    paramValue: process.env.NEXT_PUBLIC_AFFILIATE_CLOUDACADEMY_REF ?? "",
    disclosure:
      "Affiliate link to Cloud Academy. IAM Lens may receive a commission on sign-ups.",
  },
  acloudguru: {
    id: "acloudguru",
    name: "A Cloud Guru",
    baseUrl: "https://acloudguru.com",
    paramName: "utm_source",
    paramValue: process.env.NEXT_PUBLIC_AFFILIATE_ACG_REF ?? "",
    disclosure:
      "Affiliate link to A Cloud Guru. IAM Lens may receive a commission on sign-ups.",
  },
};

export function buildAffiliateUrl(
  partnerId: keyof typeof PARTNERS,
  path: string,
): string {
  const partner = PARTNERS[partnerId];
  if (!partner) throw new Error(`Unknown affiliate partner: ${partnerId}`);

  const url = new URL(
    path.startsWith("http") ? path : `${partner.baseUrl}${path}`,
  );

  if (partner.paramName && partner.paramValue) {
    url.searchParams.set(partner.paramName, partner.paramValue);
  }

  return url.toString();
}

declare global {
  interface Window {
    plausible?: (
      event: string,
      options?: { props?: Record<string, string | number | boolean> },
    ) => void;
  }
}

export function trackAffiliateClick(
  partnerId: keyof typeof PARTNERS,
  label: string,
): void {
  if (typeof window === "undefined") return;
  window.plausible?.("Affiliate Click", {
    props: { partner: partnerId, label },
  });
}
