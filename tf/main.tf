provider "aws" {
  //access_key = "${var.access_key}"
  //secret_key = "${var.secret_key}"
  region = "eu-west-1"
}

data "aws_iam_policy_document" "function_role_policy" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::370365310734:user/lukemgriffith"]
    }

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "function_role" {
  name               = "YNABRole"
  assume_role_policy = "${data.aws_iam_policy_document.function_role_policy.json}"
}

data "aws_iam_policy_document" "bucket_policy" {
  # Bucket policy trumps IAM policy, needs to explicitly be allowed access for management.
  statement {
    sid = "labmdaRoleGet"

    effect = "Allow"

    principals = {
      type        = "AWS"
      identifiers = ["${aws_iam_role.function_role.arn}"]
    }

    actions = [
      "s3:Get*",
      "s3:List*",
    ]

    resources = [
      "arn:aws:s3:::lglambdaconfig",
    ]
  }
}

resource "aws_s3_bucket" "labmdaFunctionConfig" {
  bucket     = "lglambdaconfig"
  acl        = "private"
  policy     = "${data.aws_iam_policy_document.bucket_policy.json}"
  depends_on = ["aws_iam_role.function_role"]
}
