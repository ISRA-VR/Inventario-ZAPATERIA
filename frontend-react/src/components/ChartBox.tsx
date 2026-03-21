import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

import "../styles/ChartBox.css";

type Props = {
  title: string;
};

const data = [
  { name: "Lun", ventas: 400 },
  { name: "Mar", ventas: 300 },
  { name: "Mié", ventas: 500 },
  { name: "Jue", ventas: 200 },
  { name: "Vie", ventas: 700 },
  { name: "Sáb", ventas: 600 },
  { name: "Dom", ventas: 800 },
];

export default function ChartBox({ title }: Props) {
  return (
    <div className="chart-box">
      <p>{title}</p>

      <div className="chart">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="ventas" stroke="#0f2d4a" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}