import { MAX_NOTICE_IMAGES_TOTAL_BYTES } from "./constants";

/**
 * 이미지 payload 크기 계산 유틸 (클라이언트·서버 공용, DOM 의존 없음).
 *
 * base64/data URL 문자열은 전부 ASCII이므로 문자열 길이가 곧 JSON 본문에서
 * 차지하는 바이트 수다. 클라이언트는 data URL 전체, 서버는 prefix를 제거한
 * base64를 측정하므로 서버 쪽이 장당 수십 바이트 더 관대하다.
 */
export function imagePayloadBytes(data: string): number {
  return data.length;
}

export function totalImagePayloadBytes(
  images: ReadonlyArray<{ data: string }>,
): number {
  return images.reduce((sum, img) => sum + imagePayloadBytes(img.data), 0);
}

/**
 * 누적 합계가 limit을 처음 넘어서는 이미지의 0-based index. 없으면 -1.
 * "N번째 사진을 빼고 다시 시도" 안내에 쓰인다.
 */
export function findOverflowIndex(
  images: ReadonlyArray<{ data: string }>,
  limit: number = MAX_NOTICE_IMAGES_TOTAL_BYTES,
): number {
  let used = 0;
  for (let i = 0; i < images.length; i++) {
    used += imagePayloadBytes(images[i].data);
    if (used > limit) return i;
  }
  return -1;
}

export function formatMB(bytes: number, digits = 1): string {
  return `${(bytes / (1024 * 1024)).toFixed(digits)}MB`;
}
