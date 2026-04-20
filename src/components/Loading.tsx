import { useEffect, useState } from "react";

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
  showProgress?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function Loading({ 
  message = "Đang tải...", 
  fullScreen = true,
  showProgress = true,
  size = "md"
}: LoadingProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!showProgress) return;
    
    // Simulate progress from 0 to 90%
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return 90;
        // Slower progress as it gets higher
        const increment = prev < 30 ? 5 : prev < 70 ? 3 : 1;
        return Math.min(prev + increment, 90);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [showProgress]);

  const sizeClasses = {
    sm: {
      text: "text-sm",
      progress: "w-48"
    },
    md: {
      text: "text-base sm:text-lg",
      progress: "w-64 sm:w-80"
    },
    lg: {
      text: "text-lg sm:text-xl",
      progress: "w-72 sm:w-96"
    }
  };

  const classes = sizeClasses[size];

  const content = (
    <div className="flex flex-col items-center justify-center space-y-4 sm:space-y-6">
      {/* Progress Bar */}
      {showProgress && (
        <div className={`${classes.progress} max-w-full`}>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-full transition-all duration-300 ease-out shadow-lg"
              style={{ width: `${progress}%` }}
            >
              <div className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500 text-center font-medium">
            {progress}%
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className="text-center space-y-2">
          <p className={`${classes.text} font-semibold text-gray-700`}>
            {message}
          </p>
          <div className="flex items-center justify-center space-x-1">
            <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0s" }}></span>
            <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
            <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></span>
          </div>
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4 py-6 overflow-hidden">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      {content}
    </div>
  );
}
