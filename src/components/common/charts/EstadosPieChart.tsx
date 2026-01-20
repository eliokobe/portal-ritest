import React, { memo, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface EstadosPieChartProps {
  data: { name: string; value: number; percentage: number }[];
  title: string;
  description: string;
}

const EstadosPieChart = memo<EstadosPieChartProps>(({ data, title, description }) => {
  const colors = useMemo(() => [
    '#1F4D11', '#2E7016', '#3D931A', '#4DB61F',
    '#5CD923', '#6BFC28', '#008606'
  ], []);
  
  const total = useMemo(() => 
    data.reduce((sum, item) => sum + item.value, 0), 
    [data]
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8 transition-shadow hover:shadow-md">
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-8">{description}</p>
      <div className="flex flex-col lg:flex-row items-center justify-center gap-12">
        <div className="relative">
          <ResponsiveContainer width={350} height={350}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={85}
                outerRadius={130}
                fill="#8884d8"
                dataKey="value"
                paddingAngle={3}
                stroke="#fff"
                strokeWidth={3}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 16px'
                }}
                formatter={(value: any, _name: string | undefined, props: any) => [
                  `${value} registros (${props.payload.percentage}%)`,
                  props.payload.name
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">{total}</div>
              <div className="text-sm text-gray-500 mt-1">Total</div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 max-w-md">
          {data.map((estado, index) => (
            <div 
              key={estado.name} 
              className="flex items-center gap-4 p-3 rounded-lg bg-white border border-gray-100"
            >
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="text-sm font-semibold text-gray-900 flex-1">{estado.name}</span>
              <div className="text-right">
                <div className="text-sm font-bold text-gray-900">{estado.value}</div>
                <div className="text-xs text-gray-500">{estado.percentage}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

EstadosPieChart.displayName = 'EstadosPieChart';

export default EstadosPieChart;
