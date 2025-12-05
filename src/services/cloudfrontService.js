/**
 * AWS CloudFront Service
 * Generates CloudFront URLs for S3 objects for faster global delivery
 */

const CLOUDFRONT_DOMAIN = process.env.AWS_CLOUDFRONT_DOMAIN;
const CLOUDFRONT_DISTRIBUTION_ID = process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID;

/**
 * Generate CloudFront URL from S3 key
 * @param {string} s3Key - S3 object key
 * @param {Object} options - URL options
 * @param {string} options.width - Image width for transformation (optional)
 * @param {string} options.height - Image height for transformation (optional)
 * @param {string} options.quality - Image quality (optional, if using Lambda@Edge)
 * @returns {string} CloudFront URL
 */
function getCloudFrontUrl(s3Key, options = {}) {
  if (!CLOUDFRONT_DOMAIN) {
    console.warn('[CloudFront] CLOUDFRONT_DOMAIN not set, using S3 URL');
    // Fallback to S3 URL if CloudFront not configured
    const BUCKET = process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_NAME;
    const REGION = process.env.AWS_REGION || process.env.AWS_S3_REGION;
    
    if (REGION === 'us-east-1') {
      return `https://${BUCKET}.s3.amazonaws.com/${s3Key}`;
    } else {
      return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${s3Key}`;
    }
  }

  // Remove leading slash if present
  const cleanKey = s3Key.startsWith('/') ? s3Key.substring(1) : s3Key;

  // Build CloudFront URL
  let url = `https://${CLOUDFRONT_DOMAIN}/${cleanKey}`;

  // Add query parameters for image transformation (if using Lambda@Edge)
  // Note: This requires Lambda@Edge setup in CloudFront
  const params = new URLSearchParams();
  if (options.width) params.append('w', options.width);
  if (options.height) params.append('h', options.height);
  if (options.quality) params.append('q', options.quality);
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  return url;
}

/**
 * Generate multiple size URLs for responsive images
 * @param {string} s3Key - S3 object key
 * @returns {Object} Object with different size URLs
 */
function getResponsiveUrls(s3Key) {
  return {
    thumbnail: getCloudFrontUrl(s3Key, { width: '400', height: '400', quality: '80' }),
    small: getCloudFrontUrl(s3Key, { width: '800', height: '800', quality: '85' }),
    medium: getCloudFrontUrl(s3Key, { width: '1080', height: '1080', quality: '90' }),
    large: getCloudFrontUrl(s3Key, { width: '1920', height: '1920', quality: '95' }),
    original: getCloudFrontUrl(s3Key),
  };
}

/**
 * Invalidate CloudFront cache for specific paths
 * Note: Requires CloudFront invalidation permissions
 * @param {Array<string>} paths - Array of paths to invalidate
 * @returns {Promise<Object>} Invalidation result
 */
async function invalidateCache(paths) {
  if (!CLOUDFRONT_DISTRIBUTION_ID) {
    console.warn('[CloudFront] CLOUDFRONT_DISTRIBUTION_ID not set, skipping invalidation');
    return { success: false, message: 'CloudFront not configured' };
  }

  try {
    // Note: This requires @aws-sdk/client-cloudfront
    // Uncomment and install if you need cache invalidation
    /*
    const { CloudFrontClient, CreateInvalidationCommand } = require('@aws-sdk/client-cloudfront');
    
    const cloudfront = new CloudFrontClient({ region: process.env.AWS_REGION });
    
    const command = new CreateInvalidationCommand({
      DistributionId: CLOUDFRONT_DISTRIBUTION_ID,
      InvalidationBatch: {
        Paths: {
          Quantity: paths.length,
          Items: paths,
        },
        CallerReference: `invalidation-${Date.now()}`,
      },
    });

    const result = await cloudfront.send(command);
    console.log('[CloudFront] Cache invalidation created:', result.Invalidation?.Id);
    return { success: true, invalidationId: result.Invalidation?.Id };
    */
    
    console.log('[CloudFront] Cache invalidation skipped (not implemented)');
    return { success: false, message: 'Invalidation not implemented' };
  } catch (error) {
    console.error('[CloudFront] Cache invalidation error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  getCloudFrontUrl,
  getResponsiveUrls,
  invalidateCache,
};

