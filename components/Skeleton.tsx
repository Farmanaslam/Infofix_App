
import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

export const SkeletonCard: React.FC = () => (
  <div className="relative overflow-hidden rounded-xl shadow-lg bg-white p-6 h-32 border border-gray-100">
    <div className="flex justify-between items-start relative z-10">
      <div className="space-y-3">
        <Skeleton className="h-4 w-24 bg-gray-300" />
        <Skeleton className="h-8 w-16 bg-gray-300" />
      </div>
      <div className="p-3 bg-gray-100 rounded-lg">
         <Skeleton className="h-6 w-6 bg-gray-300" />
      </div>
    </div>
    <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-gray-50"></div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; cols?: number; columnWidths?: string[] }> = ({ rows = 5, cols = 5, columnWidths }) => {
  const columns = columnWidths ? columnWidths.length : cols;
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50">
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="p-4 border-b border-gray-200">
                  <Skeleton className={`h-4 bg-gray-300 ${columnWidths ? columnWidths[i] : 'w-24'}`} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {Array.from({ length: rows }).map((_, idx) => (
              <tr key={idx}>
                {Array.from({ length: columns }).map((_, i) => (
                  <td key={i} className="p-4">
                    <Skeleton className={`h-4 bg-gray-200 ${columnWidths ? columnWidths[i] : 'w-full'}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 5 }) => (
    <div className="space-y-4">
        {Array.from({ length: count }).map((_, idx) => (
            <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                    <Skeleton className="h-4 w-20 bg-gray-300" />
                    <Skeleton className="h-6 w-16 bg-gray-200 rounded-full" />
                </div>
                <Skeleton className="h-6 w-3/4 bg-gray-300 mb-2" />
                <Skeleton className="h-4 w-1/2 bg-gray-200" />
            </div>
        ))}
    </div>
);

export const SkeletonDashboard: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar Skeleton */}
      <div className="w-64 p-4 bg-gray-800 flex-shrink-0 hidden md:flex flex-col space-y-4 transition-all duration-300 ease-in-out">
         <div className="flex justify-center mb-8">
             <Skeleton className="h-16 w-full bg-gray-700 rounded-lg" />
         </div>
         <ul className="space-y-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <li key={i} className="flex items-center p-3 rounded-lg">
                    <Skeleton className="h-6 w-6 bg-gray-700 rounded" />
                    <Skeleton className="ml-3 h-4 w-32 bg-gray-700 rounded" />
                </li>
            ))}
         </ul>
         <div className="mt-auto">
            <Skeleton className="h-3 w-32 bg-gray-700 mx-auto" />
         </div>
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
        {/* Header Skeleton */}
        <div className="bg-gray-800 shadow-md p-4 flex justify-between items-center z-10 h-16">
             <div className="flex items-center">
                <Skeleton className="h-8 w-8 bg-gray-700 md:hidden mr-4 rounded" />
                <div className="relative w-full max-w-xs md:max-w-md">
                    <Skeleton className="h-10 w-64 bg-gray-700 rounded-lg" />
                </div>
             </div>
             <div className="flex items-center space-x-4">
                 <Skeleton className="h-10 w-10 bg-gray-700 rounded-full" />
                 <div className="flex items-center space-x-2">
                    <Skeleton className="h-10 w-10 bg-gray-700 rounded-full" />
                    <div className="hidden md:flex flex-col items-start space-y-1">
                        <Skeleton className="h-3 w-24 bg-gray-700" />
                        <Skeleton className="h-2 w-16 bg-gray-700" />
                    </div>
                 </div>
             </div>
        </div>

        {/* Main Content Skeleton */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 lg:p-8">
           <div className="flex justify-between items-center mb-8">
              <Skeleton className="h-10 w-64 bg-gray-300" />
              <Skeleton className="h-4 w-48 bg-gray-300" />
           </div>

           {/* Stats Grid */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
           </div>

           {/* Charts/Tables Area */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               {/* Table Skeleton */}
               <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 h-auto">
                  <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center">
                         <Skeleton className="h-8 w-2 bg-gray-300 rounded-full mr-3" />
                         <Skeleton className="h-6 w-48 bg-gray-300" />
                      </div>
                      <Skeleton className="h-6 w-20 bg-gray-100 rounded-full" />
                  </div>
                  <div className="space-y-4">
                      <div className="flex space-x-4 bg-gray-50 p-3 rounded-t-lg">
                         <Skeleton className="h-4 w-20 bg-gray-300" />
                         <Skeleton className="h-4 w-32 bg-gray-300" />
                         <Skeleton className="h-4 w-24 bg-gray-300" />
                      </div>
                      {[1, 2, 3, 4].map(i => (
                          <div key={i} className="flex space-x-4 border-b border-gray-50 pb-3 px-3">
                              <Skeleton className="h-4 w-20 bg-gray-200" />
                              <Skeleton className="h-4 w-32 bg-gray-200" />
                              <Skeleton className="h-4 w-24 bg-gray-200" />
                          </div>
                      ))}
                  </div>
               </div>
               
               {/* Grid/Cards Skeleton */}
               <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center">
                         <Skeleton className="h-8 w-2 bg-gray-300 rounded-full mr-3" />
                         <Skeleton className="h-6 w-48 bg-gray-300" />
                      </div>
                  </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       {[1, 2, 3, 4].map(i => (
                           <div key={i} className="h-24 bg-white border border-gray-200 p-5 rounded-xl relative overflow-hidden">
                               <div className="flex justify-between mb-2">
                                   <Skeleton className="h-5 w-20 bg-gray-300" />
                                   <Skeleton className="h-6 w-8 bg-gray-300" />
                               </div>
                               <Skeleton className="h-2 w-full bg-gray-200 rounded-full mt-2" />
                           </div>
                       ))}
                   </div>
               </div>
           </div>
        </main>
      </div>
    </div>
  );
};
