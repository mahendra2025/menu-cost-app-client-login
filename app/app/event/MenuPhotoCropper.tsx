'use client';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import type {
  PointerEvent as ReactPointerEvent,
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
  const cropStageRef = useRef<HTMLDivElement>(null);

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

  function beginCropDrag(
    mode:
      | 'move'
      | 'top-left'
      | 'top-right'
      | 'bottom-left'
      | 'bottom-right',
    event: ReactPointerEvent<HTMLElement>,
  ) {
    const stage = cropStageRef.current;

    if (!stage || processing) {
      return;
    }

    event.preventDefault();

    const bounds = stage.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const startCrop = crop;

    function clamp(value: number, minimum: number, maximum: number) {
      return Math.min(maximum, Math.max(minimum, value));
    }

    function handlePointerMove(pointerEvent: PointerEvent) {
      pointerEvent.preventDefault();

      const deltaX = (pointerEvent.clientX - startX) / bounds.width * 100;
      const deltaY = (pointerEvent.clientY - startY) / bounds.height * 100;
      const width = 100 - startCrop.left - startCrop.right;
      const height = 100 - startCrop.top - startCrop.bottom;

      if (mode === 'move') {
        const left = clamp(startCrop.left + deltaX, 0, 100 - width);
        const top = clamp(startCrop.top + deltaY, 0, 100 - height);

        setCrop({
          left,
          right: 100 - width - left,
          top,
          bottom: 100 - height - top,
        });

        return;
      }

      const next = { ...startCrop };

      if (mode.includes('left')) {
        next.left = clamp(startCrop.left + deltaX, 0, 80 - startCrop.right);
      }

      if (mode.includes('right')) {
        next.right = clamp(startCrop.right - deltaX, 0, 80 - startCrop.left);
      }

      if (mode.includes('top')) {
        next.top = clamp(startCrop.top + deltaY, 0, 80 - startCrop.bottom);
      }

      if (mode.includes('bottom')) {
        next.bottom = clamp(startCrop.bottom - deltaY, 0, 80 - startCrop.top);
      }

      setCrop(next);
    }

    function stopPointerDrag() {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopPointerDrag);
      window.removeEventListener('pointercancel', stopPointerDrag);
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', stopPointerDrag, { once: true });
    window.addEventListener('pointercancel', stopPointerDrag, { once: true });
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
            <p>Drag the crop box or its corners by hand so only the menu remains.</p>
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
          <div className="menu-crop-stage" ref={cropStageRef}>
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
              onPointerDown={(event) => beginCropDrag('move', event)}
              role="presentation"
            />
            {([
              ['top-left', crop.left, crop.top],
              ['top-right', 100 - crop.right, crop.top],
              ['bottom-left', crop.left, 100 - crop.bottom],
              ['bottom-right', 100 - crop.right, 100 - crop.bottom],
            ] as const).map(([corner, left, top]) => (
              <button
                className={`menu-crop-handle ${corner}`}
                type="button"
                key={corner}
                disabled={processing}
                aria-label={`Drag ${corner.replace('-', ' ')} crop corner`}
                style={{ left: `${left}%`, top: `${top}%` }}
                onPointerDown={(event) => beginCropDrag(corner, event)}
              />
            ))}
          </div>
        </div>

        <p className="menu-crop-hand-tip">
          <span aria-hidden="true">↔</span>
          Drag inside to move. Drag a gold corner to resize.
        </p>

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
