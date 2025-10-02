// Lab6.jsx
import React, { useState } from "react";
import "./Lab6.css";

const Lab6 = () => {
  const [mode, setMode] = useState("generate");
  const [privateKey, setPrivateKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [message, setMessage] = useState("");
  const [signature, setSignature] = useState("");
  const [status, setStatus] = useState("");

  const curveParams = {
    // id-tc26-gost-3410-2012-256-paramSetA
    p: BigInt(
      "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFD97"
    ),
    a: BigInt(
      "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFD94"
    ),
    b: BigInt(166),
    q: BigInt(
      "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF6C611070995AD10045841B09B761B893"
    ),
    // Базовая точка G
    x: BigInt("0x1"),
    y: BigInt(
      "0x8D91E471E0989CDA27DF505A453F2B7635294F2DDF23E3B122ACC99C9E9F1E14"
    ),
  };

  // ------------------------
  // Утилиты: конвертации
  // ------------------------
  const safeHexToBigInt = (hex) => {
    try {
      if (!hex || typeof hex !== "string") {
        throw new Error("Пустая строка или неверный тип");
      }
      let cleanHex = hex.replace(/^0x/i, "").replace(/\s/g, "").trim();
      if (cleanHex.length === 0) {
        throw new Error("Пустая строка после очистки");
      }
      if (!/^[0-9a-fA-F]+$/.test(cleanHex)) {
        throw new Error(`Содержит не-hex символы: ${cleanHex}`);
      }
      return BigInt("0x" + cleanHex);
    } catch (error) {
      console.error("Ошибка преобразования hex:", hex, error);
      throw new Error(`Неверный hex формат: ${error.message}`);
    }
  };

  const bigIntToHex = (num) => {
    try {
      if (typeof num !== "bigint") num = BigInt(num);
      let hex = num.toString(16);
      if (hex.length % 2) hex = "0" + hex;
      return "0x" + hex.toUpperCase();
    } catch (error) {
      throw new Error(`Ошибка преобразования в hex: ${error.message}`);
    }
  };

  // ------------------------
  // Модулярная арифметика
  // ------------------------
  const mod = (a, m) => {
    let res = a % m;
    return res >= BigInt(0) ? res : res + m;
  };

  const modAdd = (a, b, m) => mod(a + b, m);
  const modSub = (a, b, m) => mod(a - b, m);
  const modMul = (a, b, m) => mod(a * b, m);

  const modInverse = (a, m) => {
    // Используем расширенный алгоритм Евклида для ГОСТ
    let [old_r, r] = [a, m];
    let [old_s, s] = [BigInt(1), BigInt(0)];
    let [old_t, t] = [BigInt(0), BigInt(1)];

    while (r !== BigInt(0)) {
      const quotient = old_r / r;
      [old_r, r] = [r, old_r - quotient * r];
      [old_s, s] = [s, old_s - quotient * s];
      [old_t, t] = [t, old_t - quotient * t];
    }

    return mod(old_s, m);
  };

  // ------------------------
  // Операции с точками эллиптической кривой
  // ------------------------
  const isInfinity = (P) => P === null;

  const pointDouble = (P) => {
    if (isInfinity(P)) return null;
    const p = curveParams.p;

    if (P.y === BigInt(0)) return null;

    // slope = (3*x² + a) / (2*y) mod p
    const numerator = modAdd(
      modMul(BigInt(3), modMul(P.x, P.x, p), p),
      curveParams.a,
      p
    );
    const denominator = modMul(BigInt(2), P.y, p);
    const slope = modMul(numerator, modInverse(denominator, p), p);

    const x3 = modSub(modMul(slope, slope, p), modMul(BigInt(2), P.x, p), p);
    const y3 = modSub(modMul(slope, modSub(P.x, x3, p), p), P.y, p);

    return { x: x3, y: y3 };
  };

  const pointAdd = (P1, P2) => {
    if (isInfinity(P1)) return P2;
    if (isInfinity(P2)) return P1;

    const p = curveParams.p;

    if (P1.x === P2.x) {
      if (P1.y === P2.y) {
        return pointDouble(P1);
      } else {
        return null;
      }
    }

    const slope = modMul(
      modSub(P2.y, P1.y, p),
      modInverse(modSub(P2.x, P1.x, p), p),
      p
    );

    const x3 = modSub(modSub(modMul(slope, slope, p), P1.x, p), P2.x, p);
    const y3 = modSub(modMul(slope, modSub(P1.x, x3, p), p), P1.y, p);

    return { x: x3, y: y3 };
  };

  const pointMultiply = (k, P) => {
    if (isInfinity(P) || k === BigInt(0)) return null;
    if (k === BigInt(1)) return P;

    let result = null;
    let addend = P;
    let kTemp = k;

    while (kTemp > BigInt(0)) {
      if (kTemp & BigInt(1)) {
        result = result ? pointAdd(result, addend) : addend;
      }
      addend = pointDouble(addend);
      kTemp = kTemp >> BigInt(1);
    }

    return result;
  };

  // ------------------------
  // УЛУЧШЕННАЯ Хеш-функция (фиксированная версия)
  // ------------------------
  const hashMessage = (msg) => {
    if (!msg || msg.length === 0) {
      return BigInt(1); // Минимальное значение для пустого сообщения
    }

    // Используем более сложную хеш-функцию на основе полиномиального хеширования
    const prime = BigInt(1099511628211); // Большое простое число
    const base = BigInt(16777619);

    let hash = BigInt(0);

    for (let i = 0; i < msg.length; i++) {
      const charCode = BigInt(msg.charCodeAt(i));
      hash = (hash * base + charCode) % prime;
    }

    // Дополнительное перемешивание
    hash = hash ^ (hash >> BigInt(13));
    hash = hash * prime;
    hash = hash ^ (hash >> BigInt(15));

    // Преобразуем в число в диапазоне [1, q-1]
    let result = mod(hash, curveParams.q - BigInt(1)) + BigInt(1);

    console.log("Хеш сообщения:", msg, "->", result.toString(16));
    return result;
  };

  // ------------------------
  // Генерация случайного BigInt по ГОСТ
  // ------------------------
  const generateRandomBigInt = (max) => {
    const bytesNeeded = Math.ceil(max.toString(16).length / 2);
    const randomBuffer = new Uint8Array(bytesNeeded);
    crypto.getRandomValues(randomBuffer);

    let result = BigInt(0);
    for (let i = 0; i < bytesNeeded; i++) {
      result = (result << BigInt(8)) | BigInt(randomBuffer[i]);
    }

    return (result % (max - BigInt(1))) + BigInt(1);
  };

  // ------------------------
  // Генерация ключей по ГОСТ
  // ------------------------
  const generateKeys = () => {
    try {
      setStatus("Генерация ключей...");

      // Генерируем случайный приватный ключ (d) в диапазоне [1, q-1]
      const d = generateRandomBigInt(curveParams.q);

      const G = { x: curveParams.x, y: curveParams.y };
      const Q = pointMultiply(d, G);

      if (isInfinity(Q)) {
        throw new Error("Публичный ключ = бесконечность");
      }

      const privKeyHex = bigIntToHex(d);
      const pubKeyHex = `${bigIntToHex(Q.x)},${bigIntToHex(Q.y)}`;

      setPrivateKey(privKeyHex);
      setPublicKey(pubKeyHex);
      setStatus("✓ Ключи успешно сгенерированы по ГОСТ");

      console.log("Приватный ключ сгенерирован (ГОСТ)");
      console.log("Публичный ключ:", Q);
    } catch (error) {
      console.error("Ошибка генерации ключей:", error);
      setStatus(`✗ Ошибка генерации ключей: ${error.message}`);
    }
  };

  // ------------------------
  // Генерация подписи по ГОСТ Р 34.10-2012
  // ------------------------
  const generateSignature = () => {
    if (!privateKey || !message) {
      setStatus("✗ Заполните приватный ключ и сообщение");
      return;
    }

    try {
      setStatus("Создание подписи по ГОСТ...");

      const d = safeHexToBigInt(privateKey);
      const h = hashMessage(message);
      const G = { x: curveParams.x, y: curveParams.y };

      let r, s;
      let attempts = 0;

      do {
        attempts++;
        if (attempts > 100) {
          throw new Error("Не удалось создать подпись после 100 попыток");
        }

        // Генерируем случайный эфемерный ключ k
        const k = generateRandomBigInt(curveParams.q);

        const R = pointMultiply(k, G);

        if (isInfinity(R)) continue;

        r = mod(R.x, curveParams.q);
        if (r === BigInt(0)) continue;

        // s = (r*d + k*h) mod q - основная формула ГОСТ
        const rd = modMul(r, d, curveParams.q);
        const kh = modMul(k, h, curveParams.q);
        s = modAdd(rd, kh, curveParams.q);

        if (s !== BigInt(0)) break;
      } while (true);

      const signatureHex = `${bigIntToHex(r)},${bigIntToHex(s)}`;
      setSignature(signatureHex);
      setStatus("✓ ЭЦП успешно создана по ГОСТ");

      console.log("Подпись создана (ГОСТ):");
      console.log("r:", r.toString(16));
      console.log("s:", s.toString(16));
      console.log("h:", h.toString(16));
    } catch (error) {
      console.error("Ошибка создания подписи:", error);
      setStatus(`✗ Ошибка создания подписи: ${error.message}`);
    }
  };

  // ------------------------
  // Проверка подписи по ГОСТ Р 34.10-2012 (ИСПРАВЛЕННАЯ)
  // ------------------------
  const verifySignature = () => {
    if (!publicKey || !message || !signature) {
      setStatus("✗ Заполните все поля для проверки");
      return;
    }

    try {
      setStatus("Проверка подписи по ГОСТ...");

      // Парсим публичный ключ
      const pubParts = publicKey.split(",");
      if (pubParts.length !== 2) {
        setStatus("✗ Неверный формат публичного ключа");
        return;
      }

      const Q = {
        x: safeHexToBigInt(pubParts[0]),
        y: safeHexToBigInt(pubParts[1]),
      };

      // Парсим подпись
      const sigParts = signature.split(",");
      if (sigParts.length !== 2) {
        setStatus("✗ Неверный формат подписи");
        return;
      }

      const r = safeHexToBigInt(sigParts[0]);
      const s = safeHexToBigInt(sigParts[1]);

      // Проверяем диапазоны по ГОСТ
      if (
        r <= BigInt(0) ||
        r >= curveParams.q ||
        s <= BigInt(0) ||
        s >= curveParams.q
      ) {
        setStatus("✗ ЭЦП недействительна: параметры вне диапазона");
        return;
      }

      const h = hashMessage(message);

      // Проверяем что h ≠ 0 mod q
      const h_mod = mod(h, curveParams.q);
      if (h_mod === BigInt(0)) {
        setStatus("✗ ЭЦП недействительна: хеш равен 0");
        return;
      }

      // ИСПРАВЛЕННЫЙ алгоритм проверки ГОСТ:
      const hInv = modInverse(h_mod, curveParams.q);

      // z1 = s * h⁻¹ mod q
      const z1 = modMul(s, hInv, curveParams.q);

      // z2 = -r * h⁻¹ mod q
      const z2 = modMul(
        modSub(BigInt(0), r, curveParams.q),
        hInv,
        curveParams.q
      );

      const G = { x: curveParams.x, y: curveParams.y };

      // Вычисляем R' = z1*G + z2*Q
      const point1 = pointMultiply(z1, G);
      const point2 = pointMultiply(z2, Q);

      if (isInfinity(point1) || isInfinity(point2)) {
        setStatus("✗ ЭЦП недействительна: бесконечная точка");
        return;
      }

      const R_prime = pointAdd(point1, point2);

      if (isInfinity(R_prime)) {
        setStatus("✗ ЭЦП недействительна: результат - бесконечность");
        return;
      }

      // В ГОСТ сравниваем x-координату с r mod q
      const v = mod(R_prime.x, curveParams.q);
      const isValid = v === r;

      console.log("Детали проверки:");
      console.log("Сообщение:", message);
      console.log("r:", r.toString(16));
      console.log("s:", s.toString(16));
      console.log("h:", h.toString(16));
      console.log("hInv:", hInv.toString(16));
      console.log("z1:", z1.toString(16));
      console.log("z2:", z2.toString(16));
      console.log("R'.x:", R_prime.x.toString(16));
      console.log("v:", v.toString(16));
      console.log("isValid:", isValid);

      setStatus(
        isValid ? "✓ ЭЦП действительна по ГОСТ" : "✗ ЭЦП недействительна"
      );
    } catch (error) {
      console.error("Ошибка проверки подписи:", error);
      setStatus(`✗ Ошибка проверки подписи: ${error.message}`);
    }
  };

  // ------------------------
  // Дополнительные функции
  // ------------------------
  const clearAll = () => {
    setPrivateKey("");
    setPublicKey("");
    setMessage("");
    setSignature("");
    setStatus("");
  };

  const formatKeyForDisplay = (key) => {
    if (!key) return "";
    return key.length > 30 ? key.substring(0, 30) + "..." : key;
  };

  return (
    <div className="lab-content">
      <h2>ЭЦП по ГОСТ Р 34.10</h2>

      <div className="mode-selector">
        <label className="radio-label">
          <input
            type="radio"
            value="generate"
            checked={mode === "generate"}
            onChange={(e) => setMode(e.target.value)}
          />
          Генерация ЭЦП
        </label>
        <label className="radio-label">
          <input
            type="radio"
            value="verify"
            checked={mode === "verify"}
            onChange={(e) => setMode(e.target.value)}
          />
          Проверка ЭЦП
        </label>
      </div>

      <div className="lab-controls">
        <div className="input-group">
          <label>Приватный ключ (256 бит):</label>
          <div className="key-input">
            <input
              type="text"
              className="text-input"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="0x..."
            />
            <button className="generate-btn" onClick={generateKeys}>
              Сгенерировать
            </button>
          </div>
          {privateKey && (
            <div className="key-preview">
              Приватный ключ: {formatKeyForDisplay(privateKey)}
            </div>
          )}
        </div>

        <div className="input-group">
          <label>Публичный ключ (x,y):</label>
          <input
            type="text"
            className="text-input"
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            placeholder="0x...,0x..."
          />
          {publicKey && (
            <div className="key-preview">
              Публичный ключ: {formatKeyForDisplay(publicKey)}
            </div>
          )}
        </div>

        <div className="input-group">
          <label>Сообщение:</label>
          <textarea
            className="text-area"
            rows="3"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Введите сообщение для подписи/проверки..."
          />
        </div>

        <div className="input-group">
          <label>Электронная подпись (r,s):</label>
          <textarea
            className="text-area output"
            rows="2"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder={
              mode === "generate"
                ? "Здесь появится подпись в формате 0xR,0xS"
                : "Введите подпись для проверки в формате 0xR,0xS"
            }
            readOnly={mode === "generate"}
          />
        </div>

        <div className="action-buttons">
          {mode === "generate" ? (
            <button className="process-btn" onClick={generateSignature}>
              Сгенерировать ЭЦП по ГОСТ
            </button>
          ) : (
            <button className="process-btn" onClick={verifySignature}>
              Проверить ЭЦП по ГОСТ
            </button>
          )}
          <button className="clear-btn" onClick={clearAll}>
            Очистить
          </button>
        </div>

        {status && (
          <div
            className={`status-message ${
              status.includes("✓") ? "status-success" : "status-error"
            }`}
          >
            {status}
          </div>
        )}
      </div>
    </div>
  );
};

export default Lab6;
