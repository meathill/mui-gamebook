export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-2 items-center">
          <div className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} 姆伊游戏书. All rights reserved.
          </div>
          <div className="text-xs text-gray-400 mt-2 md:mt-0">
            v{process.env.NEXT_PUBLIC_APP_VERSION || 'dev'}
          </div>
          <a
            href="https://github.com/meathill/mui-gamebook"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-gray-700 px-3 rounded-md text-sm font-medium ms-auto"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
