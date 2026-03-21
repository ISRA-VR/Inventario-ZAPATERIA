import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import Card from "../components/Card";
import ChartBox from "../components/ChartBox";
import "../styles/Dashboard.css";

type Data = {
  ventasHoy: number;
  gananciaActual: number;
  gananciaMes: number;
};

export default function Dashboard() {
  const [data, setData] = useState<Data>({
    ventasHoy: 0,
    gananciaActual: 0,
    gananciaMes: 0,
  });

  useEffect(() => {
    setTimeout(() => {
      setData({
        ventasHoy: 0,
        gananciaActual: 0,
        gananciaMes: 0,
      });
    }, 500);
  }, []);

  return (
    <div className="dashboard">
      <Sidebar />

      <div className="main">
        <Header />

        <div className="cards">
          <Card title="Ventas hoy" value={data.ventasHoy} />
          <Card title="Ganancia actual" value={data.gananciaActual} />
          <Card title="Ganancia por mes" value={data.gananciaMes} />
        </div>

        <div className="charts">
          <ChartBox title="Ventas de la semana" />
          <ChartBox title="Ventas del mes" />
        </div>

        <div className="bottom">
          <ChartBox title="Lo más vendido de hoy" />
      </div>
      </div>
    </div>
  );
}