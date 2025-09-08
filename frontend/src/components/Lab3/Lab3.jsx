import { useState } from "react";
import "./Lab3.css";

const modPow = (base, exp, mod) => {
  let result = 1n;
  base = base % mod;
  while (exp > 0n) {
    if (exp % 2n === 1n) result = (result * base) % mod;
    exp = exp / 2n;
    base = (base * base) % mod;
  }
  return result;
};

const findSquareRoots = (c, p, q) => {
  const mp1 = modPow(c, (p + 1n) / 4n, p);
  const mp2 = p - mp1;

  const mq1 = modPow(c, (q + 1n) / 4n, q);
  const mq2 = q - mq1;

  const roots = [];

  const addRoot = (a, b) => {
    const M = p * q;
    const x = (a * q * modPow(q, p - 2n, p) + b * p * modPow(p, q - 2n, q)) % M;
    roots.push(x);
  };

  addRoot(mp1, mq1);
  addRoot(mp1, mq2);
  addRoot(mp2, mq1);
  addRoot(mp2, mq2);

  return roots;
};

const selectCorrectRoot = (roots) => {
  for (const root of roots) {
    if (root >= 0n && root <= 255n) {
      return root;
    }
  }

  return roots.find((root) => root >= 0n && root < 65536n) || roots[0];
};

const Lab3 = () => {
  const [inputText, setInputText] = useState("");
  const [p, setP] = useState("263");
  const [q, setQ] = useState("271");
  const [n, setN] = useState((263 * 271).toString());
  const [outputText, setOutputText] = useState("");
  const [operation, setOperation] = useState("encrypt");
  const [status, setStatus] = useState("");

  const generateKeys = () => {
    try {
      const pBig = BigInt(p);
      const qBig = BigInt(q);

      if (pBig % 4n !== 3n) {
        setStatus("Ошибка: p должно быть ≡ 3 mod 4");
        return;
      }
      if (qBig % 4n !== 3n) {
        setStatus("Ошибка: q должно быть ≡ 3 mod 4");
        return;
      }

      if (pBig < 256n) {
        setStatus("Ошибка: p должно быть не меньше 256");
        return;
      }
      if (qBig < 256n) {
        setStatus("Ошибка: q должно быть не меньше 256");
        return;
      }

      const nValue = (pBig * qBig).toString();
      setN(nValue);
      setStatus(`Ключи сгенерированы! n = ${nValue}`);
    } catch (err) {
      setStatus("Ошибка: неверный формат чисел");
    }
  };

  const stringToBigInts = (str) => {
    const encoder = new TextEncoder();
    return Array.from(encoder.encode(str)).map((b) => BigInt(b));
  };

  const bigIntsToString = (arr) => {
    const bytes = arr.map((b) => Number(b));
    const decoder = new TextDecoder();
    return decoder.decode(new Uint8Array(bytes));
  };

  const encrypt = (text) => {
    try {
      const nBig = BigInt(n);
      const nums = stringToBigInts(text);
      return nums
        .map((m) => {
          const encrypted = (m * m) % nBig;
          return encrypted.toString();
        })
        .join(" ");
    } catch (err) {
      return "Ошибка при шифровании: " + err.message;
    }
  };

  const decrypt = (text) => {
    try {
      if (!text.trim()) return "";

      const nums = text
        .split(" ")
        .filter((x) => x.trim())
        .map((x) => BigInt(x));
      const pBig = BigInt(p);
      const qBig = BigInt(q);

      const results = nums.map((c) => {
        const roots = findSquareRoots(c, pBig, qBig);
        return selectCorrectRoot(roots);
      });

      return bigIntsToString(results);
    } catch (err) {
      return "Ошибка при дешифровании: " + err.message;
    }
  };

  const processData = () => {
    setStatus("Обработка...");
    setTimeout(() => {
      try {
        const result =
          operation === "encrypt" ? encrypt(inputText) : decrypt(inputText);
        setOutputText(result.toString());
        setStatus("Готово!");
      } catch (err) {
        setStatus("Ошибка: " + err.message);
      }
    }, 50);
  };

  return (
    <div className="stb-cipher">
      <h2>Криптосистема Рабина</h2>

      <div className="controls">
        <div className="key-input">
          <div className="input-group">
            <label>Простое число p (≡ 3 mod 4, ≥256):</label>
            <input
              type="text"
              value={p}
              onChange={(e) => setP(e.target.value)}
              className="text-input"
            />
          </div>
          <div className="input-group">
            <label>Простое число q (≡ 3 mod 4, ≥256):</label>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="text-input"
            />
          </div>
          <button onClick={generateKeys} className="generate-btn">
            Сгенерировать ключи
          </button>
        </div>

        <div className="input-group">
          <label>Открытый ключ n:</label>
          <input type="text" value={n} readOnly className="text-input" />
        </div>

        <div className="operation-selector">
          <label>Операция:</label>
          <select
            value={operation}
            onChange={(e) => setOperation(e.target.value)}
          >
            <option value="encrypt">Шифрование</option>
            <option value="decrypt">Дешифрование</option>
          </select>
        </div>

        <div className="input-group">
          <label>
            {operation === "encrypt"
              ? "Текст для шифрования:"
              : "Текст для дешифрования (числа через пробел):"}
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="text-area"
            rows={4}
            placeholder={
              operation === "encrypt"
                ? "Введите текст для шифрования"
                : "Введите числа через пробел (например: 5184 10201 11664)"
            }
          />
        </div>

        <button onClick={processData} className="process-btn">
          {operation === "encrypt" ? "Зашифровать" : "Расшифровать"}
        </button>

        <div className="input-group">
          <label>Результат:</label>
          <textarea
            value={outputText}
            readOnly
            className="text-area output"
            rows={4}
          />
        </div>

        {status && <div className="status">{status}</div>}
      </div>
    </div>
  );
};

export default Lab3;
