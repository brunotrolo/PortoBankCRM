variable "environment" {
  description = "Nome do ambiente"
  type        = string
}

variable "origin_domain" {
  description = "DNS name do ALB"
  type        = string
}

locals {
  common_tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    Project     = "porto-bank-crm"
    Compliance  = "BACEN-4893/LGPD"
  }
}

# =============================================================================
# CloudFront — CDN e Edge
# =============================================================================
resource "aws_cloudfront_distribution" "api" {
  origin {
    domain_name = var.origin_domain
    origin_id   = "porto-bank-crm-api-alb"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2", "TLSv1.3"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    target_origin_id = "porto-bank-crm-api-alb"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods  = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
      headers {
        name = ["Authorization", "X-Organization-Id", "X-Request-Id", "Idempotency-Key"]
      }
    }

    min_ttl     = 0
    default_ttl = 300
    max_ttl     = 3600
  }

  cache_behavior {
    path_pattern            = "/_next/*"
    target_origin_id        = "porto-bank-crm-api-alb"
    viewer_protocol_policy  = "redirect-to-https"
    allowed_methods         = ["GET", "HEAD", "OPTIONS"]
    cached_methods          = ["GET", "HEAD", "OPTIONS"]

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 86400
    default_ttl = 86400
    max_ttl     = 604800
  }

  cache_behavior {
    path_pattern            = "/api/v1/*"
    target_origin_id        = "porto-bank-crm-api-alb"
    viewer_protocol_policy  = "redirect-to-https"
    allowed_methods         = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods          = ["GET", "HEAD", "OPTIONS"]

    forwarded_values {
      query_string = true
      cookies {
        forward = "none"
      }
      headers {
        name = ["Authorization", "X-Organization-Id", "X-Request-Id", "Idempotency-Key"]
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 60
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = merge(local.common_tags, { Name = "${var.environment}-cloudfront-api" })
}

output "cloudfront_domain" { value = aws_cloudfront_distribution.api.domain_name }
