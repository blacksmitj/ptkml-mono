"use client";

import React, { useState, useCallback } from "react";
import Cropper, { Point, Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { getCroppedImg } from "@/lib/image-utils";

interface ImageCropperProps {
  image: string;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
  aspect?: number;
}

export function ImageCropper({ image, onCropComplete, onCancel, aspect }: ImageCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mediaAspect, setMediaAspect] = useState<number | undefined>(undefined);

  const onCropChange = (crop: Point) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onMediaLoaded = (mediaSize: { width: number; height: number; naturalWidth: number; naturalHeight: number }) => {
    if (!aspect) {
      setMediaAspect(mediaSize.naturalWidth / mediaSize.naturalHeight);
    }
  };

  const onCropAreaComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCrop = async () => {
    if (!croppedAreaPixels) return;
    
    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(image, croppedAreaPixels, rotation);
      if (croppedBlob) {
        onCropComplete(croppedBlob);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Sesuaikan Gambar</DialogTitle>
        </DialogHeader>
        
        <div className="relative h-[300px] w-full mt-4 bg-muted rounded-md overflow-hidden">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect ?? mediaAspect}
            onCropChange={onCropChange}
            onCropComplete={onCropAreaComplete}
            onZoomChange={onZoomChange}
            onRotationChange={setRotation}
            onMediaLoaded={onMediaLoaded}
          />

        </div>

        {/* Sliders Container (Clean & Unbordered below Image) */}
        <div className="mt-4 space-y-4 select-none px-1">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-muted-foreground w-12 uppercase tracking-wider">Zoom</span>
            <ZoomOut className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
              onValueChange={(value) => setZoom(value[0])}
              className="flex-1"
            />
            <ZoomIn className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-[10px] font-bold min-w-[28px] text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-muted-foreground w-12 uppercase tracking-wider">Rotate</span>
            <RotateCw className="h-3.5 w-3.5 text-muted-foreground shrink-0 -scale-x-100" />
            <Slider
              value={[rotation]}
              min={0}
              max={360}
              step={1}
              onValueChange={(value) => setRotation(value[0])}
              className="flex-1"
            />
            <RotateCw className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-[10px] font-bold min-w-[28px] text-right">
              {rotation}°
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-4">
          <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
            Batal
          </Button>
          <Button onClick={handleCrop} disabled={isProcessing}>
            {isProcessing ? "Memproses..." : "Potong & Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
