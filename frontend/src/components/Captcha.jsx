import { useEffect, useState } from "react";

export default function Captcha({ onChange }) {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [value, setValue] = useState("");

  useEffect(() => {
    generate();
  }, []);

  const generate = () => {
    setA(Math.floor(Math.random() * 10));
    setB(Math.floor(Math.random() * 10));
    setValue("");
    onChange(false);
  };

  const validate = (v) => {
    setValue(v);
    onChange(Number(v) === a + b);
  };

  return (
    <div className="captcha-box-math">
      <div className="captcha-header-math">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="security-icon">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a37.453 37.453 0 0 1-1.043 3.296 37.712 37.712 0 0 1-3.568 5.729 2.36 2.36 0 0 1-3.966 0 37.714 37.714 0 0 1-3.568-5.729A37.455 37.455 0 0 1 3 12c0-.388.01-.772.029-1.152C3.158 8.01 5.378 5.438 8.165 2.768a.75.75 0 0 1 .845-.162c2.09.843 4.298 1.488 6.564 1.705.81.078 1.426.758 1.426 1.572V12Z" />
        </svg>
        <span className="captcha-title">Verificación de Seguridad</span>
      </div>
      
      <div className="captcha-challenge-row">
        <div className="math-expression">
            <span>{a}</span>
            <span className="math-operator">+</span>
            <span>{b}</span>
            <span className="math-operator">=</span>
            <span className="math-question">?</span>
        </div>

        <button type="button" onClick={generate} className="btn-refresh-mini">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Nuevo
        </button>
      </div>

      <input
        className="captcha-input-math"
        type="number" 
        placeholder="Escribe el resultado"
        value={value}
        onChange={(e) => validate(e.target.value)}
      />
    </div>
  );
}