import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'cyan' | 'indigo' | 'violet' | 'orange' | 'pink' | 'teal' | 'rose' | 'lime';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  className = '',
}) => {
  const baseStyles = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
    cyan: 'bg-cyan-100 text-cyan-800',
    indigo: 'bg-indigo-100 text-indigo-800',
    violet: 'bg-violet-100 text-violet-800',
    orange: 'bg-orange-100 text-orange-800',
    pink: 'bg-pink-100 text-pink-800',
    teal: 'bg-teal-100 text-teal-800',
    rose: 'bg-rose-100 text-rose-800',
    lime: 'bg-lime-100 text-lime-800',
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
