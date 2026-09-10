/** 공지·안내 참고 사진 업로드 제한 */
export const MAX_NOTICE_IMAGES = 10;

/** 선택 가능한 원본 파일 한 장의 최대 용량(압축 전, MB) */
export const MAX_NOTICE_IMAGE_SIZE_MB = 5;

/**
 * 압축 후 실제로 전송되는 이미지 payload(base64 문자열) 전체 합계 상한.
 * Vercel 함수 요청 본문 제한(4.5MB, 설정으로 상향 불가)보다 여유를 둔 값이다.
 */
export const MAX_NOTICE_IMAGES_TOTAL_BYTES = 3 * 1024 * 1024;

/** 클라이언트 JPEG 재인코딩 설정 */
export const NOTICE_IMAGE_MAX_EDGE_PX = 1280;
export const NOTICE_IMAGE_START_QUALITY = 0.8;
export const NOTICE_IMAGE_MIN_QUALITY = 0.5;
export const NOTICE_IMAGE_QUALITY_STEP = 0.1;
