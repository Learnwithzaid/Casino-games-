import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSkeletonProps {
  count?: number;
  className?: string;
  variant?: 'reel' | 'text' | 'button' | 'card';
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  count = 1,
  className = '',
  variant = 'text'
}) => {
  const getSkeletonContent = () => {
    switch (variant) {
      case 'reel':
        return (
          <div className="h-24 md:h-28 p-2">
            <div className="flex flex-col gap-2 h-full">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-16 md:h-20 loading-skeleton rounded-lg border-2 border-slot-accent"
                />
              ))}
            </div>
          </div>
        );

      case 'button':
        return (
          <div className="h-12 w-full loading-skeleton rounded-lg" />
        );

      case 'card':
        return (
          <div className="bg-slot-secondary border-2 border-slot-accent rounded-lg p-4 space-y-3">
            <div className="h-6 loading-skeleton rounded w-3/4" />
            <div className="h-8 loading-skeleton rounded w-1/2" />
            <div className="h-4 loading-skeleton rounded w-full" />
            <div className="h-4 loading-skeleton rounded w-2/3" />
          </div>
        );

      default:
        return (
          <div className="h-4 loading-skeleton rounded w-full" />
        );
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.1 }}
        >
          {getSkeletonContent()}
        </motion.div>
      ))}
    </div>
  );
};

// Predefined skeleton layouts for common components
export const ReelSkeleton: React.FC = () => <LoadingSkeleton variant="reel" />;

export const ButtonSkeleton: React.FC = () => <LoadingSkeleton variant="button" />;

export const CardSkeleton: React.FC = () => <LoadingSkeleton variant="card" />;

export default LoadingSkeleton;