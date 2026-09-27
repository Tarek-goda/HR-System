// core/components/avatar-cropper/avatar-cropper.ts
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, AfterViewInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-avatar-cropper',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avatar-cropper.html'
})
export class AvatarCropper implements AfterViewInit {
  @Input({ required: true }) imageFile!: File;
  @Output() cropped = new EventEmitter<File>();
  @Output() cancelled = new EventEmitter<void>();

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private image = new Image();
  private ctx!: CanvasRenderingContext2D;
  private readonly CANVAS_SIZE = 280;

  zoom = signal(1);
  private minZoom = 1;
  private offsetX = 0;
  private offsetY = 0;
  private isDragging = false;
  private lastX = 0;
  private lastY = 0;

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = this.CANVAS_SIZE;
    canvas.height = this.CANVAS_SIZE;
    this.ctx = canvas.getContext('2d')!;

    const url = URL.createObjectURL(this.imageFile);
    this.image.onload = () => {
      // أقل تكبير ممكن هو اللي يخلي الصورة تغطي الدائرة بالكامل
      this.minZoom = Math.max(
        this.CANVAS_SIZE / this.image.width,
        this.CANVAS_SIZE / this.image.height
      );
      this.zoom.set(this.minZoom);
      this.offsetX = 0;
      this.offsetY = 0;
      this.draw();
      URL.revokeObjectURL(url);
    };
    this.image.src = url;
  }

  private draw() {
    const ctx = this.ctx;
    const size = this.CANVAS_SIZE;
    ctx.clearRect(0, 0, size, size);

    const scale = this.zoom();
    const w = this.image.width * scale;
    const h = this.image.height * scale;
    const x = (size - w) / 2 + this.offsetX;
    const y = (size - h) / 2 + this.offsetY;

    ctx.save();
    // قص دائري (بس عشان نشوف المعاينة، مش بيأثر على الملف النهائي هنا)
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(this.image, x, y, w, h);
    ctx.restore();
  }

  onZoomChange(value: string) {
    this.zoom.set(Number(value));
    this.clampOffsets();
    this.draw();
  }

  private clampOffsets() {
    const scale = this.zoom();
    const w = this.image.width * scale;
    const h = this.image.height * scale;
    const maxOffsetX = Math.max(0, (w - this.CANVAS_SIZE) / 2);
    const maxOffsetY = Math.max(0, (h - this.CANVAS_SIZE) / 2);
    this.offsetX = Math.min(maxOffsetX, Math.max(-maxOffsetX, this.offsetX));
    this.offsetY = Math.min(maxOffsetY, Math.max(-maxOffsetY, this.offsetY));
  }

  onPointerDown(event: PointerEvent) {
    this.isDragging = true;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
  }

  onPointerMove(event: PointerEvent) {
    if (!this.isDragging) return;
    this.offsetX += event.clientX - this.lastX;
    this.offsetY += event.clientY - this.lastY;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.clampOffsets();
    this.draw();
  }

  onPointerUp() {
    this.isDragging = false;
  }

  onSave() {
    const output = document.createElement('canvas');
    output.width = 400;
    output.height = 400;
    const outCtx = output.getContext('2d')!;

    const scale = this.zoom() * (400 / this.CANVAS_SIZE);
    const w = this.image.width * scale;
    const h = this.image.height * scale;
    const x = (400 - w) / 2 + this.offsetX * (400 / this.CANVAS_SIZE);
    const y = (400 - h) / 2 + this.offsetY * (400 / this.CANVAS_SIZE);

    outCtx.beginPath();
    outCtx.arc(200, 200, 200, 0, Math.PI * 2);
    outCtx.clip();
    outCtx.drawImage(this.image, x, y, w, h);

    output.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'avatar.png', { type: 'image/png' });
      this.cropped.emit(file);
    }, 'image/png');
  }

  onCancel() {
    this.cancelled.emit();
  }
}