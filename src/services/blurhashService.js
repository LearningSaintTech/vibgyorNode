const { encode } = require('blurhash');
const sharp = require('sharp');

/**
 * BlurHash Service
 * Generates BlurHash strings from images for instant placeholders
 */

/**
 * Generate BlurHash from image buffer
 * @param {Buffer} imageBuffer - Image buffer
 * @param {Object} options - Options
 * @param {number} options.componentX - X component count (default: 4)
 * @param {number} options.componentY - Y component count (default: 4)
 * @returns {Promise<string>} BlurHash string
 */
async function generateBlurHash(imageBuffer, options = {}) {
  const {
    componentX = 4, // Default 4x4 components (good balance)
    componentY = 4,
  } = options;

  try {
    // Resize image to small size for faster processing (32x32 is optimal)
    const resizedImage = await sharp(imageBuffer)
      .resize(32, 32, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });

    const { data, info } = resizedImage;
    const { width, height } = info;

    // Convert to RGBA array for blurhash encoding
    const pixels = new Uint8ClampedArray(data);

    // Encode to BlurHash
    const blurhash = encode(
      pixels,
      width,
      height,
      componentX,
      componentY
    );

    console.log(`✅ BlurHash generated: ${blurhash.substring(0, 20)}...`);
    return blurhash;
  } catch (error) {
    console.error('❌ Error generating BlurHash:', error);
    // Return null if generation fails (non-critical)
    return null;
  }
}

/**
 * Generate BlurHash from image URL (downloads first)
 * @param {string} imageUrl - Image URL
 * @param {Object} options - Options
 * @returns {Promise<string>} BlurHash string
 */
async function generateBlurHashFromUrl(imageUrl, options = {}) {
  try {
    const axios = require('axios');
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000, // 10 second timeout
    });

    const imageBuffer = Buffer.from(response.data);
    return await generateBlurHash(imageBuffer, options);
  } catch (error) {
    console.error('❌ Error generating BlurHash from URL:', error);
    return null;
  }
}

module.exports = {
  generateBlurHash,
  generateBlurHashFromUrl,
};

