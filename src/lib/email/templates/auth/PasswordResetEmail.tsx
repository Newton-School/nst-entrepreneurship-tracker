import * as React from "react";
import { Heading, Text, Link } from "@react-email/components";
import { EmailLayout, EmailHeader, EmailFooter, ActionCard, CTAButton } from "../components";

export interface PasswordResetEmailProps {
  recipientName: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export const PasswordResetEmail = ({
  recipientName,
  resetUrl,
  expiresInMinutes,
}: PasswordResetEmailProps) => {
  return (
    <EmailLayout previewText="Reset your NST Entrepreneurship Tracker password">
      <EmailHeader />
      <Heading style={titleStyle}>Reset Your Password</Heading>
      <Text style={introText}>Hi {recipientName},</Text>
      <Text style={bodyText}>
        We received a request to reset the password for your NST Entrepreneurship Tracker account.
        Choose a new password using the button below.
      </Text>
      <CTAButton label="Reset Password" url={resetUrl} />
      <ActionCard
        type="warning"
        title="This link expires soon"
        content={`For your security, this link works only once and expires in ${expiresInMinutes} minutes. Request a new one from the sign-in page if it has already lapsed.`}
      />
      <Text style={bodyText}>
        If the button does not work, copy and paste this address into your browser:
      </Text>
      <Text style={urlText}>
        <Link href={resetUrl} style={urlLink}>
          {resetUrl}
        </Link>
      </Text>
      <Text style={closingText}>
        If you did not request a password reset, you can safely ignore this email — your password
        stays unchanged and no one can access your account through this link.
      </Text>
      <EmailFooter />
    </EmailLayout>
  );
};

const titleStyle = {
  fontSize: "22px",
  fontWeight: "700",
  color: "#111827",
  margin: "0 0 20px 0",
};

const introText = {
  fontSize: "16px",
  color: "#1f2937",
  margin: "0 0 16px 0",
  lineHeight: "1.5",
};

const bodyText = {
  fontSize: "15px",
  color: "#4b5563",
  margin: "0 0 16px 0",
  lineHeight: "1.5",
};

const urlText = {
  margin: "0 0 16px 0",
  fontSize: "12px",
  lineHeight: "1.5",
  wordBreak: "break-all" as const,
};

const urlLink = {
  color: "#c99b2e",
  textDecoration: "underline",
};

const closingText = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "24px 0 0 0",
  lineHeight: "1.5",
};
