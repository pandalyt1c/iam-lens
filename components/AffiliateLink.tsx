"use client";

import {
  buildAffiliateUrl,
  trackAffiliateClick,
  PARTNERS,
} from "@/lib/affiliates";

interface AffiliateLinkProps {
  partner: keyof typeof PARTNERS;
  path: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function AffiliateLink({
  partner,
  path,
  label,
  children,
  className,
}: AffiliateLinkProps) {
  const href = buildAffiliateUrl(partner, path);

  return (
    <a
      href={href}
      target="_blank"
      rel="sponsored noopener noreferrer"
      onClick={() => trackAffiliateClick(partner, label)}
      className={className}
    >
      {children}
    </a>
  );
}

export function AffiliateDisclosure({
  partners,
}: {
  partners: Array<keyof typeof PARTNERS>;
}) {
  const lines = partners.map((id) => PARTNERS[id]?.disclosure).filter(Boolean);
  if (lines.length === 0) return null;

  return (
    <aside className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
      {lines.map((line, i) => (
        <p key={i}>{line}</p>
      ))}
    </aside>
  );
}
