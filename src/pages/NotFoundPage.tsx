import { useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full max-w-md sm:max-w-lg rounded-2xl bg-white p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6 sm:space-y-8 text-center">
        <div className="space-y-3 sm:space-y-4">
          <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-amber-100 flex items-center justify-center">
            <svg
              className="w-10 h-10 sm:w-12 sm:h-12 text-amber-600"
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
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900">
              404
            </h1>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">
              Trang không tìm thấy
            </h2>
          </div>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-md mx-auto">
            Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển. Vui lòng kiểm tra lại đường dẫn hoặc quay về trang chủ.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <button
            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm sm:text-base font-semibold hover:from-blue-700 hover:to-blue-800 active:scale-[0.98] transition-all shadow-md hover:shadow-lg"
            onClick={() => navigate("/")}
          >
            Quay về trang chủ
          </button>
          <button
            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg sm:rounded-xl border-2 border-slate-300 text-slate-700 text-sm sm:text-base font-semibold hover:bg-slate-50 active:scale-[0.98] transition-all"
            onClick={() => navigate(-1)}
          >
            Quay lại
          </button>
        </div>
      </div>
    </div>
  );
}
