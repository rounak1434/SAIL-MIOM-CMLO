import { motion } from 'framer-motion';

const DashboardSkeleton = () => {
  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="h-10 w-64 bg-slate-200 dark:bg-slate-700/50 rounded-lg animate-pulse mb-2"></div>
          <div className="h-5 w-96 bg-slate-100 dark:bg-slate-700/30 rounded animate-pulse"></div>
        </motion.div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {Array.from({ length: 6 }).map((_, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className="bg-white dark:bg-[#181B21] border border-slate-200 dark:border-slate-800 shadow-sm p-6 rounded-xl"
            >
              <div className="w-12 h-12 mb-4 rounded-xl bg-slate-200 dark:bg-slate-700/50 animate-pulse"></div>
              <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-20 bg-slate-100 dark:bg-slate-700/30 rounded animate-pulse"></div>
            </motion.div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-[#181B21] border border-slate-200 dark:border-slate-800 shadow-sm p-6 rounded-xl"
          >
            <div className="h-7 w-48 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse mb-4"></div>
            <div className="h-[300px] w-full bg-slate-100 dark:bg-slate-700/30 rounded animate-pulse"></div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-[#181B21] border border-slate-200 dark:border-slate-800 shadow-sm p-6 rounded-xl"
          >
            <div className="h-7 w-48 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse mb-4"></div>
            <div className="h-[300px] w-full bg-slate-100 dark:bg-slate-700/30 rounded animate-pulse"></div>
          </motion.div>
        </div>

        {/* Moderator Management Skeleton */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-[#181B21] border border-slate-200 dark:border-slate-800 shadow-sm p-6 mb-8 rounded-xl"
        >
          <div className="flex justify-between items-center mb-6">
            <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse"></div>
            <div className="h-10 w-36 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse"></div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-200 dark:border-slate-800 rounded-xl">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-24 bg-slate-100 dark:bg-slate-700/30 rounded animate-pulse"></div>
                  </div>
                  <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-slate-100 dark:bg-slate-700/30 rounded animate-pulse"></div>
                  <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-700/30 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Complaints Table Skeleton */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-[#181B21] border border-slate-200 dark:border-slate-800 shadow-sm p-6 rounded-xl"
        >
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700/50 rounded animate-pulse mb-6"></div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  {['ID', 'Title', 'Category', 'Status', 'Priority', 'Assigned To', 'Actions'].map((_, index) => (
                    <th key={index} className="text-left py-3 px-4">
                      <div className="h-4 w-20 bg-slate-100 dark:bg-slate-700/30 rounded animate-pulse"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-slate-100 dark:border-slate-800">
                    {Array.from({ length: 7 }).map((_, colIndex) => (
                      <td key={colIndex} className="py-3 px-4">
                        <div className={`h-4 bg-slate-100 dark:bg-slate-700/30 rounded animate-pulse ${colIndex === 1 ? 'w-32' : 'w-20'}`}></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
