import { useRef, useState } from 'react';
import Icon from './Icon';

const MAX_IMAGES = 3;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_DIMENSION = 1600;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the file'));
    reader.readAsDataURL(file);
  });
}

// Large photos from phones are scaled down in the browser so uploads stay
// under the 2 MB limit and load quickly for maintenance staff.
async function prepareImage(file) {
  const original = await readAsDataUrl(file);
  if (file.size <= MAX_BYTES * 0.6) return original;

  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not open the image'));
    image.src = original;
  });
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

const dataUrlBytes = (dataUrl) => Math.ceil(((dataUrl.length - dataUrl.indexOf(',') - 1) * 3) / 4);

export default function ImagePicker({ images, onChange }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleFiles(fileList) {
    setError('');
    const files = Array.from(fileList).slice(0, MAX_IMAGES - images.length);
    if (fileList.length > files.length) setError(`You can attach up to ${MAX_IMAGES} photos.`);
    setBusy(true);
    const added = [];
    for (const file of files) {
      if (!ACCEPTED.includes(file.type)) {
        setError('Only JPEG, PNG or WebP photos can be attached.');
        continue;
      }
      try {
        const dataUrl = await prepareImage(file);
        if (dataUrlBytes(dataUrl) > MAX_BYTES) {
          setError(`${file.name} is too large even after resizing.`);
          continue;
        }
        added.push({ name: file.name, dataUrl });
      } catch (err) {
        setError(err.message);
      }
    }
    setBusy(false);
    if (added.length) onChange([...images, ...added]);
  }

  return (
    <div className="field">
      <div className="image-picker">
        {images.map((image, index) => (
          <div key={image.dataUrl.slice(-40) + index} className="image-picker__thumb">
            <img src={image.dataUrl} alt={`Attachment ${index + 1}: ${image.name}`} />
            <button type="button" className="image-picker__remove" aria-label={`Remove ${image.name}`} onClick={() => onChange(images.filter((_, i) => i !== index))}>
              <Icon name="x" size={13} strokeWidth={2.25} />
            </button>
          </div>
        ))}
        {images.length < MAX_IMAGES && (
          <button type="button" className="image-picker__add" onClick={() => inputRef.current?.click()} disabled={busy}>
            <Icon name={busy ? 'clock' : 'image'} size={18} />
            {busy ? 'Processing…' : 'Add photo'}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        multiple
        hidden
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
      {error ? <span className="field__error">{error}</span> : <span className="field__hint">Up to {MAX_IMAGES} photos · JPEG, PNG or WebP · large photos are resized automatically</span>}
    </div>
  );
}
