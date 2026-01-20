import React, { memo } from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: React.ElementType;
  color?: string;
}

const StatCard = memo<StatCardProps>(({ label, value, icon: Icon, color }) => (
  <div className="bg-white rounded-lg border border-gray-100 p-6 hover:border-gray-200 transition-colors">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
      </div>
      {Icon && (
        <div className={`${color || 'bg-brand-primary'} p-3 rounded-lg`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      )}
    </div>
  </div>
));

StatCard.displayName = 'StatCard';

export default StatCard;
