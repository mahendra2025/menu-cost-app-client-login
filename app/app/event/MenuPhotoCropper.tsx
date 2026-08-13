'use client';

import {
  useEffect,
  useState,
} from 'react';

type CropEdges = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

const EMPTY_CROP: CropEdges = {
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
};

function croppedFileName(name: string) {
  const extensionIndex = name.lastIndexOf('.');

  if (extensionIndex <= 0) {
    return `${name}-cropped.jpg`;
  }

  return `${name.slice(0, extensionIndex)}-cropped${name.slice(extensionIndex)}`;
}

async function cropPhoto(
  file: File,
  crop: CropEdges,
) {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: 'from-image',
  });

  try {
    const sourceX = Math.round(bitmap.width * crop.left / 100);
    const sourceY = Math.round(bitmap.height * crop.top / 100);
    const sourceWidth = Math.max(
      1,
      Math.round(bitmap.width * (100 - crop.left - crop.right) / 100),
    );
    const sourceHeight = Math.max(
      1,
      Math.round(bitmap.height * (100 - crop.top - crop.bottom) / 100),
    );
    const maximumEdge = 3200;
    const scale = Math.min(
      1,
      maximumEdge / Math.max(sourceWidth, sourceHeight),
    );
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));

    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Photo cropping is not supported by this browser.');
    }

    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      bitmap,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (value) => value ? resolve(value) : reject(new Error('The cropped photo could not be created.')),
        outputType,
        outputType === 'image/jpeg' ? 0.92 : undefined,
      );
    });

    canvas.width = 0;
    canvas.height = 0;

    return new File(
      [blob],
      croppedFileName(file.name),
      {
        type: outputType,
        lastModified: Date.now(),
      },
    );
  } finally {
    bitmap.close();
  }
}

export default function MenuPhotoCropper({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [crop, setCrop] = useState<CropEdges>(EMPTY_CROP);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  function updateEdge(edge: keyof CropEdges, value: number) {
    setCrop((current) => {
      const opposite = edge === 'left'
        ? current.right
        : edge === 'right'
          ? current.left
          : edge === 'top'
            ? current.bottom
            : current.top;

      return {
        ...current,
        [edge]: Math.min(value, 80 - opposite),
      };
    });
  }

  async function confirmCrop() {
    setProcessing(true);
    setError('');

    try {
      onConfirm(await cropPhoto(file, crop));
    } catch (cropError) {
      setError(
        cropError instanceof Error
          ? cropError.message
          : 'The photo could not be cropped.',
      );
      setProcessing(false);
    }
  }

  const hasCrop = Object.values(crop).some((value) => value > 0);

  return (
    <div className="menu-crop-backdrop" role="presentation">
      <section
        className="menu-crop-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="menuCropTitle"
      >
        <div className="menu-crop-heading">
          <div>
            <span className="page-eyebrow">Photo editor</span>
            <h2 id="menuCropTitle">Crop menu photo</h2>
            <p>Trim away the table, hands, and empty space so only the menu remains.</p>
          </div>
          <button
            className="menu-crop-close"
            type="button"
            onClick={onCancel}
            disabled={processing}
            aria-label="Close photo crop"
          >
            ×
          </button>
        </div>

        <div className="menu-crop-preview">
          <div className="menu-crop-stage">
            {previewUrl ? <img src={previewUrl} alt="Menu photo crop preview" /> : null}
            <span className="menu-crop-mask top" style={{ height: `${crop.top}%` }} />
            <span className="menu-crop-mask right" style={{ width: `${crop.right}%`, top: `${crop.top}%`, bottom: `${crop.bottom}%` }} />
            <span className="menu-crop-mask bottom" style={{ height: `${crop.bottom}%` }} />
            <span className="menu-crop-mask left" style={{ width: `${crop.left}%`, top: `${crop.top}%`, bottom: `${crop.bottom}%` }} />
            <span
              className="menu-crop-selection"
              style={{
                inset: `${crop.top}% ${crop.right}% ${crop.bottom}% ${crop.left}%`,
              }}
            />
          </div>
        </div>

        <div className="menu-crop-controls">
          {(['top', 'bottom', 'left', 'right'] as const).map((edge) => (
            <label key={edge}>
              <span>{edge[0].toUpperCase() + edge.slice(1)}</span>
              <input
                type="range"
                min="0"
                max="45"
                step="1"
                value={crop[edge]}
                disabled={processing}
                onChange={(event) => updateEdge(edge, Number(event.target.value))}
              />
              <b>{crop[edge]}%</b>
            </label>
          ))}
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="menu-crop-actions">
          <button
            className="ghost-button"
            type="button"
            disabled={processing}
            onClick={() => onConfirm(file)}
          >
            Use full photo
          </button>
          <button
            className="primary-button"
            type="button"
            disabled={processing}
            onClick={() => void confirmCrop()}
          >
            {processing ? 'Cropping…' : hasCrop ? 'Crop & scan' : 'Scan photo'}
          </button>
        </div>
      </section>
    </div>
  );
}
