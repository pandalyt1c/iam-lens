import type { ParsedPolicy } from "./types";

export type ExampleCategory =
  | "least-privilege"
  | "read-only"
  | "service-role"
  | "cross-account"
  | "dangerous"
  | "deny";

export interface PolicyExample {
  slug: string;
  title: string;
  description: string;
  category: ExampleCategory;
  policy: string;
  expected: ParsedPolicy;
}

export const examples: PolicyExample[] = [
  {
    slug: "s3-read-only-bucket",
    title: "S3 read-only access to one bucket",
    description:
      "Lets a principal list and read objects from a single bucket. A common least-privilege starting point for analytics or backup readers.",
    category: "least-privilege",
    policy: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListBucket",
      "Effect": "Allow",
      "Action": ["s3:ListBucket", "s3:GetBucketLocation"],
      "Resource": "arn:aws:s3:::example-reports"
    },
    {
      "Sid": "ReadObjects",
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::example-reports/*"
    }
  ]
}`,
    expected: {
      version: "2012-10-17",
      id: null,
      statements: [
        {
          sid: "ListBucket",
          effect: "Allow",
          principals: [],
          notPrincipals: [],
          actions: ["s3:ListBucket", "s3:GetBucketLocation"],
          isNotAction: false,
          resources: ["arn:aws:s3:::example-reports"],
          isNotResource: false,
          conditions: [],
        },
        {
          sid: "ReadObjects",
          effect: "Allow",
          principals: [],
          notPrincipals: [],
          actions: ["s3:GetObject"],
          isNotAction: false,
          resources: ["arn:aws:s3:::example-reports/*"],
          isNotResource: false,
          conditions: [],
        },
      ],
    },
  },
  {
    slug: "ec2-describe-only",
    title: "EC2 describe-only (auditor)",
    description:
      "Allows read-only inspection of EC2 inventory. Useful for compliance or monitoring tools that should never mutate infrastructure.",
    category: "read-only",
    policy: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:DescribeSecurityGroups",
        "ec2:DescribeVpcs",
        "ec2:DescribeSubnets",
        "ec2:DescribeTags"
      ],
      "Resource": "*"
    }
  ]
}`,
    expected: {
      version: "2012-10-17",
      id: null,
      statements: [
        {
          sid: null,
          effect: "Allow",
          principals: [],
          notPrincipals: [],
          actions: [
            "ec2:DescribeInstances",
            "ec2:DescribeSecurityGroups",
            "ec2:DescribeVpcs",
            "ec2:DescribeSubnets",
            "ec2:DescribeTags",
          ],
          isNotAction: false,
          resources: ["*"],
          isNotResource: false,
          conditions: [],
        },
      ],
    },
  },
  {
    slug: "lambda-invoke-specific",
    title: "Invoke a single Lambda function",
    description:
      "Permits invoking exactly one function ARN. The narrow Resource is the whole point — wildcards here would let the principal trigger any function in the account.",
    category: "least-privilege",
    policy: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "lambda:InvokeFunction",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:process-orders"
    }
  ]
}`,
    expected: {
      version: "2012-10-17",
      id: null,
      statements: [
        {
          sid: null,
          effect: "Allow",
          principals: [],
          notPrincipals: [],
          actions: ["lambda:InvokeFunction"],
          isNotAction: false,
          resources: [
            "arn:aws:lambda:us-east-1:123456789012:function:process-orders",
          ],
          isNotResource: false,
          conditions: [],
        },
      ],
    },
  },
  {
    slug: "lambda-execution-role-trust",
    title: "Lambda execution role trust policy",
    description:
      "Trust policy that lets the Lambda service assume this role. Attached as the role's AssumeRolePolicyDocument, not as an identity policy.",
    category: "service-role",
    policy: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}`,
    expected: {
      version: "2012-10-17",
      id: null,
      statements: [
        {
          sid: null,
          effect: "Allow",
          principals: [{ kind: "Service", value: "lambda.amazonaws.com" }],
          notPrincipals: [],
          actions: ["sts:AssumeRole"],
          isNotAction: false,
          resources: [],
          isNotResource: false,
          conditions: [],
        },
      ],
    },
  },
  {
    slug: "cross-account-s3-read",
    title: "Cross-account S3 bucket read",
    description:
      "Bucket policy granting another AWS account read access. Note the explicit account ARN in Principal — wildcards here would expose the bucket publicly.",
    category: "cross-account",
    policy: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPartnerAccountRead",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::222233334444:root" },
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::shared-data",
        "arn:aws:s3:::shared-data/*"
      ]
    }
  ]
}`,
    expected: {
      version: "2012-10-17",
      id: null,
      statements: [
        {
          sid: "AllowPartnerAccountRead",
          effect: "Allow",
          principals: [
            { kind: "AWS", value: "arn:aws:iam::222233334444:root" },
          ],
          notPrincipals: [],
          actions: ["s3:GetObject", "s3:ListBucket"],
          isNotAction: false,
          resources: [
            "arn:aws:s3:::shared-data",
            "arn:aws:s3:::shared-data/*",
          ],
          isNotResource: false,
          conditions: [],
        },
      ],
    },
  },
  {
    slug: "deny-without-mfa",
    title: "Deny everything unless MFA is present",
    description:
      "Guardrail statement that blocks all actions when the caller hasn't authenticated with MFA. Pair with a permissive Allow elsewhere; Deny always wins.",
    category: "deny",
    policy: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyAllExceptListedIfNoMFA",
      "Effect": "Deny",
      "NotAction": [
        "iam:CreateVirtualMFADevice",
        "iam:EnableMFADevice",
        "iam:GetUser",
        "iam:ListMFADevices",
        "iam:ListVirtualMFADevices",
        "iam:ResyncMFADevice",
        "sts:GetSessionToken"
      ],
      "Resource": "*",
      "Condition": {
        "BoolIfExists": { "aws:MultiFactorAuthPresent": "false" }
      }
    }
  ]
}`,
    expected: {
      version: "2012-10-17",
      id: null,
      statements: [
        {
          sid: "DenyAllExceptListedIfNoMFA",
          effect: "Deny",
          principals: [],
          notPrincipals: [],
          actions: [
            "iam:CreateVirtualMFADevice",
            "iam:EnableMFADevice",
            "iam:GetUser",
            "iam:ListMFADevices",
            "iam:ListVirtualMFADevices",
            "iam:ResyncMFADevice",
            "sts:GetSessionToken",
          ],
          isNotAction: true,
          resources: ["*"],
          isNotResource: false,
          conditions: [
            {
              operator: "BoolIfExists",
              key: "aws:MultiFactorAuthPresent",
              values: ["false"],
            },
          ],
        },
      ],
    },
  },
  {
    slug: "admin-full-access",
    title: "Full admin access (dangerous)",
    description:
      "The classic *:* policy. Equivalent to AWS-managed AdministratorAccess. Almost never appropriate outside of break-glass roles.",
    category: "dangerous",
    policy: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "*",
      "Resource": "*"
    }
  ]
}`,
    expected: {
      version: "2012-10-17",
      id: null,
      statements: [
        {
          sid: null,
          effect: "Allow",
          principals: [],
          notPrincipals: [],
          actions: ["*"],
          isNotAction: false,
          resources: ["*"],
          isNotResource: false,
          conditions: [],
        },
      ],
    },
  },
  {
    slug: "iam-passrole-wildcard",
    title: "iam:PassRole with wildcard resource (dangerous)",
    description:
      "Lets the principal pass any role to any service — a well-known privilege-escalation primitive. Resource should always be scoped to specific role ARNs.",
    category: "dangerous",
    policy: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iam:PassRole",
        "ec2:RunInstances"
      ],
      "Resource": "*"
    }
  ]
}`,
    expected: {
      version: "2012-10-17",
      id: null,
      statements: [
        {
          sid: null,
          effect: "Allow",
          principals: [],
          notPrincipals: [],
          actions: ["iam:PassRole", "ec2:RunInstances"],
          isNotAction: false,
          resources: ["*"],
          isNotResource: false,
          conditions: [],
        },
      ],
    },
  },
];
