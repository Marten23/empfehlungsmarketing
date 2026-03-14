"use client";

import { useCallback, useRef, useState } from "react";

type ImageFocusPickerProps = {
  imageUrl: string;
  initialX?: number;
  initialY?: number;
  inputNameX: string;
  inputNameY: string;
  className?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function ImageFocusPicker({
  imageUrl,
  initialX = 50,
  initialY = 50,
  inputNameX,
  inputNameY,
  className,
}: ImageFocusPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [focusX, setFocusX] = useState(clamp(initialX, 0, 100));
  const [focusY, setFocusY] = useState(clamp(initialY, 0, 100));
  const [dragging, setDragging] = useState(false);

  const updateFromClientPoint = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;

    const x = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const y = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);
    setFocusX(Math.round(x));
    setFocusY(Math.round(y));
  }, []);

  const startDrag = useCallback(
    (clientX: number, clientY: number) => {
      setDragging(true);
      updateFromClientPoint(clientX, clientY);
    },
    [updateFromClientPoint],
  );

  const stopDrag = useCallback(() => {
    setDragging(false);
  }, []);

  return (
    <div className={className}>
      <input type="hidden" name={inputNameX} value={String(focusX)} />
      <input type="hidden" name={inputNameY} value={String(focusY)} />

      <p className="text-xs text-zinc-600">
        Bildausschnitt: Bild anklicken und ziehen.
      </p>
      <div
        ref={containerRef}
        className="relative mt-2 h-40 w-full max-w-md cursor-grab overflow-hidden rounded border border-zinc-200 bg-zinc-100 active:cursor-grabbing"
        onMouseDown={(event) => startDrag(event.clientX, event.clientY)}
        onMouseMove={(event) => {
          if (!dragging) return;
          updateFromClientPoint(event.clientX, event.clientY);
        }}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onTouchStart={(event) => {
          const touch = event.touches[0];
          if (!touch) return;
          startDrag(touch.clientX, touch.clientY);
        }}
        onTouchMove={(event) => {
          const touch = event.touches[0];
          if (!touch) return;
          updateFromClientPoint(touch.clientX, touch.clientY);
        }}
        onTouchEnd={stopDrag}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Bildausschnitt"
          className="h-full w-full object-cover"
          style={{ objectPosition: `${focusX}% ${focusY}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-zinc-500">
        Fokus: X {focusX}% / Y {focusY}%
      </p>
    </div>
  );
}
