import React, { memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TimeBarChartProps {
  data: { date: string; avgHours: number; count: number }[];
  title: string;
  description: string;
  countLabel: string;
}

const TimeBarChart = memo<TimeBarChartProps>(({ data, title, description, countLabel }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-8 transition-shadow hover:shadow-md">
    <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
    <p className="text-sm text-gray-500 mb-8">{description}</p>
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
        <XAxis 
          dataKey="date" 
          tickFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          stroke="#6b7280"
          style={{ fontSize: '12px', fontWeight: 500 }}
        />
        <YAxis 
          label={{ value: 'Horas', angle: -90, position: 'insideLeft', style: { fontSize: '14px', fontWeight: 600, fill: '#374151' } }}
          stroke="#6b7280"
          style={{ fontSize: '12px', fontWeight: 500 }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 16px'
          }}
          labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'short',
            year: 'numeric'
          })}
          formatter={(value: any, name: string | undefined) => {
            if (name === 'avgHours') return [`${value} horas`, 'Tiempo promedio'];
            if (name === 'count') return [`${value} ${countLabel}`, 'Completados'];
            return [value, name || ''];
          }}
        />
        <Bar 
          dataKey="avgHours" 
          fill="#008606" 
          name="avgHours" 
          radius={[8, 8, 0, 0]}
          maxBarSize={60}
        />
      </BarChart>
    </ResponsiveContainer>
  </div>
));

TimeBarChart.displayName = 'TimeBarChart';

export default TimeBarChart;
