/**
 * 공지·안내 참고 사진 클라이언트 전처리 (브라우저 전용: canvas, Image 사용).
 *
 * 1. 원본 포맷(JPEG/PNG/WebP/HEIC 등)과 무관하게 canvas에서 JPEG로 재인코딩한다.
 *    PNG 스크린샷·포스터 캡처가 원본 그대로 전송되지 않도록 강제한다.
 * 2. 긴 변을 NOTICE_IMAGE_MAX_EDGE_PX 이하로 리사이즈한다.
 * 3. 시작 quality에서 인코딩 후 실제 base64 크기를 측정해, 기존 사진을 포함한
 *    전체 합계가 MAX_NOTICE_IMAGES_TOTAL_BYTES를 넘으면 quality를 한 단계씩 낮춰
 *    재압축한다. 최소 quality까지 내려도 초과하면 그 사진은 제외하고 몇 번째
 *    사진이 빠졌는지 돌려준다.
 */
import {
  MAX_NOTICE_IMAGE_SIZE_MB,
  MAX_NOTICE_IMAGES,
  MAX_NOTICE_IMAGES_TOTAL_BYTES,
  NOTICE_IMAGE_MAX_EDGE_PX,
  NOTICE_IMAGE_MIN_QUALITY,
  NOTICE_IMAGE_QUALITY_STEP,
  NOTICE_IMAGE_START_QUALITY,
} from "./constants";
import {
  formatMB,
  imagePayloadBytes,
  totalImagePayloadBytes,
} from "./image-payload";
import type { NoticeImageInput } from "@/types";

export type SkipReason =
  | "not_image"
  | "too_large"
  | "unsupported"
  | "over_budget"
  | "count_limit";

export interface SkippedImage {
  /** 이번에 선택한 파일 목록 안에서의 순번 (1부터) */
  index: number;
  name: string;
  reason: SkipReason;
  /** 사용자에게 그대로 보여줄 한국어 안내 */
  message: string;
}

export interface PreparedImage extends NoticeImageInput {
  mimeType: "image/jpeg";
  /** 최종 채택된 JPEG quality */
  quality: number;
  /** 전송 payload(data URL 문자열) 바이트 */
  bytes: number;
  /** 원본 파일 바이트 */
  originalBytes: number;
  width: number;
  height: number;
}

export interface PrepareOptions {
  maxImages?: number;
  maxFileBytes?: number;
  totalBudgetBytes?: number;
  maxEdgePx?: number;
  startQuality?: number;
  minQuality?: number;
  qualityStep?: number;
}

export interface PrepareResult {
  images: PreparedImage[];
  skipped: SkippedImage[];
  /** 기존 사진 + 이번에 추가된 사진의 payload 합계 */
  totalBytes: number;
}

const DEFAULTS: Required<PrepareOptions> = {
  maxImages: MAX_NOTICE_IMAGES,
  maxFileBytes: MAX_NOTICE_IMAGE_SIZE_MB * 1024 * 1024,
  totalBudgetBytes: MAX_NOTICE_IMAGES_TOTAL_BYTES,
  maxEdgePx: NOTICE_IMAGE_MAX_EDGE_PX,
  startQuality: NOTICE_IMAGE_START_QUALITY,
  minQuality: NOTICE_IMAGE_MIN_QUALITY,
  qualityStep: NOTICE_IMAGE_QUALITY_STEP,
};

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
};

/**
 * 파일을 디코딩한다. createImageBitmap은 EXIF 회전을 옵션으로 명시할 수 있어
 * 우선 시도하고, 미지원 브라우저나 실패 시 <img>로 폴백한다(최신 브라우저의
 * <img>는 기본적으로 EXIF 회전을 반영한다). HEIC처럼 브라우저가 디코딩하지
 * 못하는 포맷은 양쪽 모두 실패하므로 호출부에서 "unsupported"로 처리한다.
 */
async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // <img> 폴백
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode failed"));
      el.src = url;
    });
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function fitWithin(width: number, height: number, maxEdge: number) {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** 원본을 리사이즈해 그린 canvas. 투명 영역이 JPEG에서 검게 나오지 않도록 흰 배경을 깐다. */
function drawToCanvas(decoded: DecodedImage, maxEdge: number): HTMLCanvasElement {
  const { width, height } = fitWithin(decoded.width, decoded.height, maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context를 만들 수 없습니다.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(decoded.source, 0, 0, width, height);
  return canvas;
}

function roundQuality(q: number): number {
  return Math.round(q * 100) / 100;
}

function toJpegName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  return `${base || "image"}.jpg`;
}

/**
 * 선택한 파일들을 순서대로 압축해 기존 목록에 이어 붙일 이미지와 제외 목록을 돌려준다.
 * 파일은 순차 처리해야 전체 합계 예산(totalBudgetBytes)을 정확히 누적할 수 있다.
 */
export async function prepareNoticeImages(
  files: File[],
  existing: ReadonlyArray<NoticeImageInput>,
  options: PrepareOptions = {},
): Promise<PrepareResult> {
  const opt = { ...DEFAULTS, ...options };
  const images: PreparedImage[] = [];
  const skipped: SkippedImage[] = [];
  let used = totalImagePayloadBytes(existing);
  let count = existing.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const index = i + 1;
    const label = `${index}번째 사진(${file.name})`;

    if (count >= opt.maxImages) {
      skipped.push({
        index,
        name: file.name,
        reason: "count_limit",
        message: `${label}: 이미지는 최대 ${opt.maxImages}장까지만 올릴 수 있어 제외했습니다.`,
      });
      continue;
    }

    // HEIC는 Windows에서 file.type이 빈 문자열로 오는 경우가 있어 type이 있을 때만 검사한다.
    if (file.type && !file.type.startsWith("image/")) {
      skipped.push({
        index,
        name: file.name,
        reason: "not_image",
        message: `${label}: 이미지 파일이 아니어서 제외했습니다.`,
      });
      continue;
    }

    if (file.size > opt.maxFileBytes) {
      skipped.push({
        index,
        name: file.name,
        reason: "too_large",
        message: `${label}: 원본이 ${formatMB(file.size)}로 장당 ${formatMB(opt.maxFileBytes, 0)} 제한을 넘어 제외했습니다.`,
      });
      continue;
    }

    let decoded: DecodedImage;
    try {
      decoded = await decodeImage(file);
    } catch {
      skipped.push({
        index,
        name: file.name,
        reason: "unsupported",
        message: `${label}: 이 브라우저에서 열 수 없는 형식(HEIC 등)이라 제외했습니다. JPEG/PNG로 변환해 다시 올려주세요.`,
      });
      continue;
    }

    let accepted: PreparedImage | null = null;
    try {
      const canvas = drawToCanvas(decoded, opt.maxEdgePx);
      for (
        let q = roundQuality(opt.startQuality);
        q >= opt.minQuality - 1e-6;
        q = roundQuality(q - opt.qualityStep)
      ) {
        const dataUrl = canvas.toDataURL("image/jpeg", q);
        const bytes = imagePayloadBytes(dataUrl);
        if (used + bytes <= opt.totalBudgetBytes) {
          accepted = {
            mimeType: "image/jpeg",
            data: dataUrl,
            name: toJpegName(file.name),
            quality: q,
            bytes,
            originalBytes: file.size,
            width: canvas.width,
            height: canvas.height,
          };
          break;
        }
      }
    } finally {
      decoded.release();
    }

    if (!accepted) {
      skipped.push({
        index,
        name: file.name,
        reason: "over_budget",
        message: `${label}: 최대로 압축해도 전체 사진 합계 ${formatMB(opt.totalBudgetBytes, 0)}를 넘어 제외했습니다.`,
      });
      continue;
    }

    images.push(accepted);
    used += accepted.bytes;
    count++;
  }

  return { images, skipped, totalBytes: used };
}
