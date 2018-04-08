output "s3Bucket" {
  value = "${aws_s3_bucket.labmdaFunctionConfig.arn}"
}
