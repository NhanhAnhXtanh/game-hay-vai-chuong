import { useRouteError, isRouteErrorResponse, useNavigate } from "react-router-dom";

export default function ErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  let errorTitle = "Đã xảy ra lỗi";
  let errorMessage = "Ứng dụng gặp sự cố không mong muốn. Vui lòng thử lại hoặc quay về trang chủ.";
  let is404 = false;

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      errorTitle = "404 - Trang không tìm thấy";
      errorMessage = "Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển. Vui lòng kiểm tra lại đường dẫn hoặc quay về trang chủ.";
      is404 = true;
    } else {
      errorTitle = `${error.status} - Lỗi ${error.statusText || "không xác định"}`;
      errorMessage = error.statusText || "Đã xảy ra lỗi khi tải trang.";
    }
  } else if (error instanceof Error) {
    errorTitle = "Lỗi ứng dụng";
    errorMessage = error.message || "Đã xảy ra lỗi không mong muốn.";
  } else if (error && typeof error === "object" && "status" in error) {
    // Handle other error objects that might have status
    const status = (error as { status?: number }).status;
    if (status === 404) {
      errorTitle = "404 - Trang không tìm thấy";
      errorMessage = "Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển. Vui lòng kiểm tra lại đường dẫn hoặc quay về trang chủ.";
      is404 = true;
    }
  } else {
    // Default to 404 if we can't determine the error type
    errorTitle = "404 - Trang không tìm thấy";
    errorMessage = "Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển. Vui lòng kiểm tra lại đường dẫn hoặc quay về trang chủ.";
    is404 = true;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full max-w-md sm:max-w-lg rounded-2xl bg-white p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6 sm:space-y-8 text-center">
        <div className="space-y-3 sm:space-y-4">
          <div className={`mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center ${
            is404 ? "bg-amber-100" : "bg-red-100"
          }`}>
            {is404 ? (
              <svg
                className="w-8 h-8 sm:w-10 sm:h-10 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg
                className="w-8 h-8 sm:w-10 sm:h-10 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            )}
          </div>
          {is404 && (
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900">
                404
              </h1>
            </div>
          )}
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            {errorTitle}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-md mx-auto">
            {errorMessage}
          </p>
          {error instanceof Error && process.env.NODE_ENV === "development" && (
            <details className="mt-4 text-left">
              <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                Chi tiết lỗi (chế độ phát triển)
              </summary>
              <pre className="mt-2 p-3 bg-slate-100 rounded text-xs text-red-600 overflow-auto max-h-40">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <button
            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm sm:text-base font-semibold hover:from-blue-700 hover:to-blue-800 active:scale-[0.98] transition-all shadow-md hover:shadow-lg"
            onClick={() => navigate("/")}
          >
            Quay về trang chủ
          </button>
          {!is404 && (
            <button
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg sm:rounded-xl border-2 border-slate-300 text-slate-700 text-sm sm:text-base font-semibold hover:bg-slate-50 active:scale-[0.98] transition-all"
              onClick={() => window.location.reload()}
            >
              Tải lại trang
            </button>
          )}
          {is404 && (
            <button
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg sm:rounded-xl border-2 border-slate-300 text-slate-700 text-sm sm:text-base font-semibold hover:bg-slate-50 active:scale-[0.98] transition-all"
              onClick={() => navigate(-1)}
            >
              Quay lại
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
