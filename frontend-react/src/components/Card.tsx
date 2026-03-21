import "../styles/Card.css";

type Props = {
  title: string;
  value: number;
};

export default function Card({ title, value }: Props) {
  const formatMoney = (num: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(num);

  return (
    <div className="card">
      <p>{title}</p>
      <h2>{formatMoney(value)}</h2>
    </div>
  );
}