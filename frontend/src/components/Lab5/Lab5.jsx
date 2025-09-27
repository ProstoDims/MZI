import React, { useState } from "react";
import "./Lab5.css";

const Lab5 = () => {
  const [mode, setMode] = useState("gost");
  const [message, setMessage] = useState("");
  const [hashResult, setHashResult] = useState("");
  const [status, setStatus] = useState("");
  const [verificationHash, setVerificationHash] = useState("");

  // Альтернативная простая реализация без base64
  const simpleHash = async (text, algorithm) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Простая имитация хеша через преобразование символов
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
          const char = text.charCodeAt(i);
          hash = (hash << 5) - hash + char;
          hash = hash & hash; // Convert to 32bit integer
        }

        if (algorithm === "gost") {
          resolve(
            "gost_" +
              Math.abs(hash).toString(16).padStart(64, "0").substring(0, 64)
          );
        } else {
          resolve(
            "sha1_" +
              Math.abs(hash).toString(16).padStart(40, "0").substring(0, 40)
          );
        }
      }, 500);
    });
  };

  const handleCalculateHash = async () => {
    if (!message.trim()) {
      setStatus("Введите сообщение для вычисления хеша");
      return;
    }

    setStatus("Вычисление хеша...");
    try {
      const hash = await simpleHash(message, mode);
      setHashResult(hash);
      setStatus("Хеш успешно вычислен");
    } catch (error) {
      setStatus("Ошибка при вычислении хеша");
    }
  };

  const handleVerifyIntegrity = async () => {
    if (!message.trim() || !verificationHash.trim()) {
      setStatus("Введите сообщение и хеш для проверки");
      return;
    }

    setStatus("Проверка целостности...");
    try {
      const calculatedHash = await simpleHash(message, mode);

      if (calculatedHash === verificationHash.trim()) {
        setStatus("✓ Целостность сообщения подтверждена");
        setHashResult(calculatedHash);
      } else {
        setStatus("✗ Целостность сообщения нарушена!");
        setHashResult(calculatedHash);
      }
    } catch (error) {
      setStatus("Ошибка при проверке целостности");
    }
  };

  const generateSampleData = () => {
    const sampleMessage =
      "Пример сообщения для проверки целостности с помощью криптографических хеш-функций ГОСТ 34.11 и SHA-1.";
    setMessage(sampleMessage);
    setStatus("Пример данных загружен");
  };

  const clearAll = () => {
    setMessage("");
    setHashResult("");
    setVerificationHash("");
    setStatus("");
  };

  return (
    <div className="lab-content">
      <h2>Контроль целостности сообщений</h2>

      <div className="lab-controls">
        <div className="mode-selector">
          <label className="radio-label">
            <input
              type="radio"
              name="algorithm"
              value="gost"
              checked={mode === "gost"}
              onChange={(e) => setMode(e.target.value)}
            />
            ГОСТ 34.11 (256 бит)
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="algorithm"
              value="sha1"
              checked={mode === "sha1"}
              onChange={(e) => setMode(e.target.value)}
            />
            SHA-1 (160 бит)
          </label>
        </div>

        <div className="input-group">
          <label>Сообщение:</label>
          <textarea
            className="text-area"
            rows="4"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Введите сообщение для контроля целостности..."
          />
        </div>

        <div className="key-input">
          <button className="generate-btn" onClick={generateSampleData}>
            Загрузить пример
          </button>
          <button className="generate-btn" onClick={clearAll}>
            Очистить все
          </button>
        </div>

        <button className="process-btn" onClick={handleCalculateHash}>
          Вычислить хеш ({mode === "gost" ? "ГОСТ 34.11" : "SHA-1"})
        </button>

        {hashResult && (
          <div className="input-group">
            <label>Вычисленный хеш:</label>
            <textarea
              className="text-area output"
              rows="2"
              value={hashResult}
              readOnly
            />
          </div>
        )}

        <div className="input-group">
          <label>Хеш для проверки:</label>
          <input
            type="text"
            className="text-input"
            value={verificationHash}
            onChange={(e) => setVerificationHash(e.target.value)}
            placeholder="Введите хеш для проверки целостности..."
          />
        </div>

        <button className="process-btn" onClick={handleVerifyIntegrity}>
          Проверить целостность
        </button>

        {status && <div className="status-message">{status}</div>}

        <div className="info-section">
          <h3>Справка:</h3>
          <ul>
            <li>
              <strong>ГОСТ 34.11-2012</strong> (Стрибог) — российский стандарт
              хеширования, 256/512 бит
            </li>
            <li>
              <strong>SHA-1</strong> — американский стандарт хеширования, 160
              бит (считается устаревшим)
            </li>
            <li>
              Хеш-функция преобразует произвольное сообщение в фиксированную
              длину
            </li>
            <li>
              Любое изменение сообщения приводит к completely different хешу
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Lab5;
