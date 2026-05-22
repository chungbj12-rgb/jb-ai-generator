/** AI 글 생성 중 로딩 스피너 */
export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      <p className="mt-4 text-sm font-medium text-gray-800">
        AI가 글을 생성하고 있어요
      </p>
      <p className="mt-1 text-xs text-gray-500">
        보통 10~20초 정도 소요됩니다
      </p>
    </div>
  );
}
