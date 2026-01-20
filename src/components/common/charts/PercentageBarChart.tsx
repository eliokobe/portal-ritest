import React, { memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PercentageBarChartProps {
  data: { week: string; percentage24h?: number; remotePercentage?: number; totalCases?: number; totalServices?: number }[];
  title: string;
  description: string;
  dataKey: string;
  yAxisLabel: string;
  tooltipLabel: string;
}

const PercentageBarChart = memo<PercentageBarChartProps>(({ data, title, description, dataKey, yAxisLabel, tooltipLabel }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-8 transition-shadow hover:shadow-md">
    <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
    <p className="text-sm text-gray-500 mb-8">{description}</p>
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
        <XAxis 
          dataKey="week" 
          tickFormatter={(value) => {
            const [year, month, day] = value.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            return `Sem ${date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
          }}
          stroke="#6b7280"
          style={{ fontSize: '12px', fontWeight: 500 }}
        />
        <YAxis 
          label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', style: { fontSize: '14px', fontWeight: 600, fill: '#374151' } }}
          stroke="#6b7280"
          style={{ fontSize: '12px', fontWeight: 500 }}
          domain={[0, 100]}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 16px'
          }}
          labelFormatter={(value) => {
            const [year, month, day] = value.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            return `Semana del ${date.toLocaleDateString('es-ES', { 
              day: 'numeric', 
              month: 'long',
              year: 'numeric'
            })}`;
          }}
          formatter={(value: any, name: string | undefined, props: any) => {
            const total = props.payload.totalCases || props.payload.totalServices;
            return [`${value}% (${total} casos)`, tooltipLabel];
          }}
        />
        <Bar 
          dataKey={dataKey} 
          fill="#008606" 
          name={dataKey}
          radius={[8, 8, 0, 0]}
          maxBarSize={60}
        />
      </BarChart>
    </ResponsiveContainer>
  </div>
));

PercentageBarChart.displayName = 'PercentageBarChart';

export default PercentageBarChart;
