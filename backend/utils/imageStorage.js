const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const ApiError = require('./ApiError');

/*
 * Complaint images arrive as base64 data URLs inside the JSON body and are
 * written to disk with Node's core fs/crypto/path modules. Each file is
 * checked by its leading bytes (not just the declared type) and stored under
 * a random 128-bit name so URLs cannot be guessed.
 */

const UPLOAD_ROOT = path.resolve(__dirname, '..', 'uploads');
const COMPLAINT_DIR = path.join(UPLOAD_ROOT, 'complaints');
const PUBLIC_PREFIX = '/uploads/complaints';

const MAX_IMAGES = 3;
const MAX_BYTES = 2 * 1024 * 1024;

const SIGNATURES = [
  { mime: 'image/jpeg', ext: '.jpg', matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: 'image/png',
    ext: '.png',
    matches: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mime: 'image/webp',
    ext: '.webp',
    matches: (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
  },
];

const DATA_URL_PATTERN = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/;

function decodeImage(image, index) {
  const label = `Image ${index + 1}`;
  const dataUrl = typeof image === 'string' ? image : image?.dataUrl;
  const match = typeof dataUrl === 'string' ? dataUrl.match(DATA_URL_PATTERN) : null;
  if (!match) throw ApiError.badRequest(`${label} must be a JPEG, PNG or WebP image`);

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0) throw ApiError.badRequest(`${label} is empty`);
  if (buffer.length > MAX_BYTES) throw ApiError.badRequest(`${label} is larger than 2 MB`);

  const signature = SIGNATURES.find((s) => s.matches(buffer));
  if (!signature || signature.mime !== match[1]) {
    throw ApiError.badRequest(`${label} is not a valid ${match[1].replace('image/', '').toUpperCase()} file`);
  }
  return { buffer, ext: signature.ext };
}

// Validates every image first, then writes them. Returns public URL paths.
async function saveComplaintImages(images = []) {
  if (!Array.isArray(images) || images.length === 0) return [];
  if (images.length > MAX_IMAGES) throw ApiError.badRequest(`You can attach at most ${MAX_IMAGES} images`);

  const decoded = images.map(decodeImage);
  await fs.mkdir(COMPLAINT_DIR, { recursive: true });

  const written = [];
  try {
    for (const { buffer, ext } of decoded) {
      const fileName = `${crypto.randomBytes(16).toString('hex')}${ext}`;
      await fs.writeFile(path.join(COMPLAINT_DIR, fileName), buffer);
      written.push(fileName);
    }
  } catch (err) {
    await removeFiles(written);
    throw err;
  }
  return written.map((name) => `${PUBLIC_PREFIX}/${name}`);
}

async function removeFiles(fileNames) {
  await Promise.all(fileNames.map((name) => fs.rm(path.join(COMPLAINT_DIR, name), { force: true })));
}

async function deleteComplaintImages(publicPaths = []) {
  await removeFiles(publicPaths.map((p) => path.basename(p)));
}

module.exports = { saveComplaintImages, deleteComplaintImages, UPLOAD_ROOT, MAX_IMAGES };
