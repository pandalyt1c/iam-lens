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
    slug: "dynamodb-table-readwrite",
    title: "DynamoDB read/write on one table",
    description:
      "CRUD on a specific DynamoDB table and its indexes. The two-resource pattern (table + table/index/*) is the standard scoping for apps that query GSIs.",
    category: "least-privilege",
    policy: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:BatchWriteItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:123456789012:table/Orders",
        "arn:aws:dynamodb:us-east-1:123456789012:table/Orders/index/*"
      ]
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
            "dynamodb:GetItem",
            "dynamodb:PutItem",
            "dynamodb:UpdateItem",
            "dynamodb:DeleteItem",
            "dynamodb:Query",
            "dynamodb:BatchWriteItem",
          ],
          isNotAction: false,
          resources: [
            "arn:aws:dynamodb:us-east-1:123456789012:table/Orders",
            "arn:aws:dynamodb:us-east-1:123456789012:table/Orders/index/*",
          ],
          isNotResource: false,
          conditions: [],
        },
      ],
    },
  },
  {
    slug: "secretsmanager-read-one-secret",
    title: "Read a single Secrets Manager secret",
    description:
      "Lets the principal fetch one secret value. The trailing `-??????` matches the random suffix Secrets Manager appends to ARNs.",
    category: "least-privilege",
    policy: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/db/credentials-??????"
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
          actions: ["secretsmanager:GetSecretValue"],
          isNotAction: false,
          resources: [
            "arn:aws:secretsmanager:us-east-1:123456789012:secret:prod/db/credentials-??????",
          ],
          isNotResource: false,
          conditions: [],
        },
      ],
    },
  },
  {
    slug: "cloudwatch-logs-lambda",
    title: "CloudWatch Logs for a Lambda",
    description:
      "Minimum logging permissions a Lambda needs. The CreateLogGroup + CreateLogStream + PutLogEvents triad is what AWSLambdaBasicExecutionRole grants — but scoped to one log group.",
    category: "service-role",
    policy: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "logs:CreateLogGroup",
      "Resource": "arn:aws:logs:us-east-1:123456789012:*"
    },
    {
      "Effect": "Allow",
      "Action": ["logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/process-orders:*"
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
          actions: ["logs:CreateLogGroup"],
          isNotAction: false,
          resources: ["arn:aws:logs:us-east-1:123456789012:*"],
          isNotResource: false,
          conditions: [],
        },
        {
          sid: null,
          effect: "Allow",
          principals: [],
          notPrincipals: [],
          actions: ["logs:CreateLogStream", "logs:PutLogEvents"],
          isNotAction: false,
          resources: [
            "arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/process-orders:*",
          ],
          isNotResource: false,
          conditions: [],
        },
      ],
    },
  },
  {
    slug: "kms-decrypt-scoped",
    title: "KMS decrypt scoped to one key",
    description:
      "Decrypt only with a specific KMS key, only when the call originates from S3 in the same account. ViaService conditions are how you keep keys from being usable outside their intended path.",
    category: "least-privilege",
    policy: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["kms:Decrypt", "kms:DescribeKey"],
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/abcd1234-ab12-cd34-ef56-1234567890ab",
      "Condition": {
        "StringEquals": {
          "kms:ViaService": "s3.us-east-1.amazonaws.com"
        }
      }
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
          actions: ["kms:Decrypt", "kms:DescribeKey"],
          isNotAction: false,
          resources: [
            "arn:aws:kms:us-east-1:123456789012:key/abcd1234-ab12-cd34-ef56-1234567890ab",
          ],
          isNotResource: false,
          conditions: [
            {
              operator: "StringEquals",
              key: "kms:ViaService",
              values: ["s3.us-east-1.amazonaws.com"],
            },
          ],
        },
      ],
    },
  },
  {
    slug: "s3-deny-insecure-transport",
    title: "Deny S3 access without TLS",
    description:
      "Bucket policy guardrail: any request not using HTTPS gets denied. Pair with a bucket-level Allow; this Deny acts as the SSL enforcement layer.",
    category: "deny",
    policy: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::secure-bucket",
        "arn:aws:s3:::secure-bucket/*"
      ],
      "Condition": {
        "Bool": { "aws:SecureTransport": "false" }
      }
    }
  ]
}`,
    expected: {
      version: "2012-10-17",
      id: null,
      statements: [
        {
          sid: "DenyInsecureTransport",
          effect: "Deny",
          principals: [{ kind: "Wildcard", value: "*" }],
          notPrincipals: [],
          actions: ["s3:*"],
          isNotAction: false,
          resources: [
            "arn:aws:s3:::secure-bucket",
            "arn:aws:s3:::secure-bucket/*",
          ],
          isNotResource: false,
          conditions: [
            {
              operator: "Bool",
              key: "aws:SecureTransport",
              values: ["false"],
            },
          ],
        },
      ],
    },
  },
  {
    slug: "cross-account-assume-role-external-id",
    title: "Cross-account AssumeRole with ExternalID",
    description:
      "Trust policy for a third-party vendor. The ExternalID condition is the canonical defense against the confused-deputy problem.",
    category: "cross-account",
    policy: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::222233334444:root" },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "vendor-unique-token-9f3a"
        }
      }
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
          principals: [
            { kind: "AWS", value: "arn:aws:iam::222233334444:root" },
          ],
          notPrincipals: [],
          actions: ["sts:AssumeRole"],
          isNotAction: false,
          resources: [],
          isNotResource: false,
          conditions: [
            {
              operator: "StringEquals",
              key: "sts:ExternalId",
              values: ["vendor-unique-token-9f3a"],
            },
          ],
        },
      ],
    },
  },
  {
    slug: "sqs-consumer",
    title: "SQS consumer (read + delete)",
    description:
      "Standard worker permissions: receive messages, delete after processing, and read queue attributes. Scoped to a single queue ARN.",
    category: "least-privilege",
    policy: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes",
        "sqs:GetQueueUrl"
      ],
      "Resource": "arn:aws:sqs:us-east-1:123456789012:order-events"
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
            "sqs:ReceiveMessage",
            "sqs:DeleteMessage",
            "sqs:GetQueueAttributes",
            "sqs:GetQueueUrl",
          ],
          isNotAction: false,
          resources: ["arn:aws:sqs:us-east-1:123456789012:order-events"],
          isNotResource: false,
          conditions: [],
        },
      ],
    },
  },
  {
    slug: "self-manage-credentials",
    title: "Let users manage their own credentials",
    description:
      "Pattern from the AWS-managed IAMUserChangePassword + IAMSelfManageServiceSpecificCredentials policies. The ${aws:username} variable scopes each statement to the calling user.",
    category: "least-privilege",
    policy: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iam:ChangePassword",
        "iam:GetUser",
        "iam:CreateAccessKey",
        "iam:DeleteAccessKey",
        "iam:UpdateAccessKey",
        "iam:ListAccessKeys"
      ],
      "Resource": "arn:aws:iam::*:user/\${aws:username}"
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
            "iam:ChangePassword",
            "iam:GetUser",
            "iam:CreateAccessKey",
            "iam:DeleteAccessKey",
            "iam:UpdateAccessKey",
            "iam:ListAccessKeys",
          ],
          isNotAction: false,
          resources: ["arn:aws:iam::*:user/${aws:username}"],
          isNotResource: false,
          conditions: [],
        },
      ],
    },
  },
  {
    slug: "iam-attach-any-policy",
    title: "Attach any IAM policy (privilege escalation)",
    description:
      "Lets the principal attach arbitrary managed policies — including AdministratorAccess — to themselves or any role. A textbook escalation primitive.",
    category: "dangerous",
    policy: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iam:AttachUserPolicy",
        "iam:AttachRolePolicy",
        "iam:AttachGroupPolicy"
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
            "iam:AttachUserPolicy",
            "iam:AttachRolePolicy",
            "iam:AttachGroupPolicy",
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
