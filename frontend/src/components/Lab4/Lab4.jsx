import React, { useState, useCallback } from "react";
import "./Lab4.css";

const Lab4 = () => {
  const [originalMessage, setOriginalMessage] = useState("Привет, мир!");
  const [encryptedOutput, setEncryptedOutput] = useState("");
  const [mode, setMode] = useState("encrypt");
  const [publicKey, setPublicKey] = useState({ G_prime: [], t: 0 });
  const [privateKey, setPrivateKey] = useState({
    S: [],
    G: [],
    P: [],
    S_inv: [],
  });
  const [result, setResult] = useState("");
  const [status, setStatus] = useState("");

  const BLOCK_SIZE = 4;
  const CODE_LENGTH = 8;

  // ----------- МАТРИЧНЫЕ ОПЕРАЦИИ -----------
  const multiplyMatrices = (a, b) => {
    if (!a.length || !b.length) return [];
    const result = [];
    for (let i = 0; i < a.length; i++) {
      result[i] = [];
      for (let j = 0; j < b[0].length; j++) {
        let sum = 0;
        for (let k = 0; k < a[0].length; k++) {
          sum += a[i][k] * b[k][j];
        }
        result[i][j] = sum % 2;
      }
    }
    return result;
  };

  const multiplyVectorMatrix = (vector, matrix) => {
    if (!vector.length || !matrix.length) return [];
    const result = [];
    for (let j = 0; j < matrix[0].length; j++) {
      let sum = 0;
      for (let i = 0; i < vector.length; i++) {
        sum += vector[i] * matrix[i][j];
      }
      result[j] = sum % 2;
    }
    return result;
  };

  const invertPermutationMatrix = (matrix) => {
    const result = Array(matrix.length)
      .fill(0)
      .map(() => Array(matrix.length).fill(0));

    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix.length; j++) {
        if (matrix[i][j] === 1) {
          result[j][i] = 1;
        }
      }
    }
    return result;
  };

  const invertMatrix = (matrix) => {
    const n = matrix.length;
    const augmented = matrix.map((row, i) => {
      const identityRow = Array(n).fill(0);
      identityRow[i] = 1;
      return [...row, ...identityRow];
    });

    for (let i = 0; i < n; i++) {
      let pivotRow = i;
      while (pivotRow < n && augmented[pivotRow][i] === 0) {
        pivotRow++;
      }

      if (pivotRow === n) {
        console.error("Матрица вырождена");
        return null;
      }

      if (pivotRow !== i) {
        [augmented[i], augmented[pivotRow]] = [
          augmented[pivotRow],
          augmented[i],
        ];
      }

      for (let j = 0; j < n; j++) {
        if (j !== i && augmented[j][i] === 1) {
          for (let k = 0; k < 2 * n; k++) {
            augmented[j][k] = (augmented[j][k] + augmented[i][k]) % 2;
          }
        }
      }
    }

    return augmented.map((row) => row.slice(n));
  };

  // ----------- ПРЕОБРАЗОВАНИЯ ТЕКСТА (UTF-8) -----------
  const textToBinaryVector = useCallback((text) => {
    if (!text) return [];
    const encoder = new TextEncoder(); // UTF-8
    const bytes = encoder.encode(text); // Uint8Array
    let result = [];
    for (let i = 0; i < bytes.length; i++) {
      const bin = bytes[i].toString(2).padStart(8, "0").split("").map(Number);
      result = result.concat(bin);
    }
    return result;
  }, []);

  const binaryVectorToText = useCallback((vector) => {
    if (!vector.length) return "";
    const bytes = [];
    for (let i = 0; i < vector.length; i += 8) {
      const byte = vector.slice(i, i + 8);
      if (byte.length === 8) {
        bytes.push(parseInt(byte.join(""), 2));
      }
    }
    try {
      const decoder = new TextDecoder("utf-8");
      return decoder.decode(new Uint8Array(bytes));
    } catch {
      return "";
    }
  }, []);

  const textToBlocks = useCallback(
    (text, blockSize) => {
      const binaryVector = textToBinaryVector(text);
      const blocks = [];
      for (let i = 0; i < binaryVector.length; i += blockSize) {
        const block = binaryVector.slice(i, i + blockSize);
        while (block.length < blockSize) block.push(0);
        blocks.push(block);
      }
      return blocks;
    },
    [textToBinaryVector]
  );

  const blocksToText = useCallback(
    (blocks) => {
      const binaryVector = blocks.flat();
      return binaryVectorToText(binaryVector);
    },
    [binaryVectorToText]
  );

  // ----------- ДОПОЛНИТЕЛЬНЫЕ УТИЛИТЫ -----------
  const encryptedDataToString = (encryptedBlocks) =>
    encryptedBlocks
      .map((block) => ({
        e: block.encrypted.join(""),
        err: block.errorVector.join(""),
      }))
      .map((obj) => `${obj.e}:${obj.err}`)
      .join("|");

  const stringToEncryptedData = (str) => {
    if (!str) return [];
    return str.split("|").map((part) => {
      const [encryptedStr, errorStr] = part.split(":");
      return {
        encrypted: encryptedStr.split("").map(Number),
        errorVector: errorStr.split("").map(Number),
      };
    });
  };

  const generateErrorVector = (length, t) => {
    const vector = Array(length).fill(0);
    let errors = 0;
    while (errors < t) {
      const pos = Math.floor(Math.random() * length);
      if (vector[pos] === 0) {
        vector[pos] = 1;
        errors++;
      }
    }
    return vector;
  };

  const showStatus = (message) => {
    setStatus(message);
    setTimeout(() => setStatus(""), 3000);
  };

  // ----------- ДЕКОДЕР -----------
  const decodeWithErrorCorrection = useCallback((y_prime, G, t) => {
    const k = G.length;
    const n = G[0].length;

    let bestVector = null;
    let minErrors = n + 1;

    for (let i = 0; i < Math.pow(2, k); i++) {
      const testVector = [];
      for (let j = 0; j < k; j++) {
        testVector.push((i >> j) & 1);
      }
      const codeword = multiplyVectorMatrix(testVector, G);
      let errors = 0;
      for (let j = 0; j < n; j++) {
        if (codeword[j] !== y_prime[j]) {
          errors++;
        }
      }
      if (errors <= t && errors < minErrors) {
        minErrors = errors;
        bestVector = testVector;
      }
    }
    return bestVector || Array(k).fill(0);
  }, []);

  // ----------- КЛЮЧИ -----------
  const generateKeys = useCallback(() => {
    const generatePermutationMatrix = (size) => {
      const indices = [...Array(size).keys()];
      for (let i = size - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      const matrix = Array(size)
        .fill(0)
        .map(() => Array(size).fill(0));
      indices.forEach((newPos, oldPos) => {
        matrix[oldPos][newPos] = 1;
      });
      return matrix;
    };

    const G = [
      [1, 0, 0, 0, 1, 1, 0, 1],
      [0, 1, 0, 0, 1, 0, 1, 1],
      [0, 0, 1, 0, 0, 1, 1, 1],
      [0, 0, 0, 1, 1, 1, 1, 0],
    ];

    const S = [
      [1, 0, 1, 1],
      [1, 1, 0, 1],
      [0, 1, 1, 1],
      [1, 0, 0, 1],
    ];

    const S_inv = invertMatrix(S);
    if (!S_inv) {
      showStatus("❌ Ошибка: матрица S вырождена");
      return;
    }

    const P = generatePermutationMatrix(CODE_LENGTH);
    const SG = multiplyMatrices(S, G);
    const G_prime = multiplyMatrices(SG, P);

    setPublicKey({ G_prime, t: 1 });
    setPrivateKey({ S, G, P, S_inv });
    setEncryptedOutput("");
    setResult("");
    showStatus("✅ Ключи успешно сгенерированы!");
  }, [CODE_LENGTH]);

  // ----------- ШИФРОВАНИЕ -----------
  const handleEncrypt = useCallback(() => {
    if (!publicKey.G_prime.length || !originalMessage) {
      showStatus("❌ Сначала сгенерируйте ключи и введите сообщение");
      return;
    }

    const blocks = textToBlocks(originalMessage, BLOCK_SIZE);
    const encryptedBlocks = blocks.map((block) => {
      const codeword = multiplyVectorMatrix(block, publicKey.G_prime);
      const errorVector = generateErrorVector(CODE_LENGTH, publicKey.t);
      const encrypted = codeword.map((bit, i) => (bit + errorVector[i]) % 2);
      return { originalBlock: block, codeword, errorVector, encrypted };
    });

    setEncryptedOutput(encryptedDataToString(encryptedBlocks));
    setResult(`Зашифровано ${blocks.length} блоков`);
    showStatus(`✅ Сообщение зашифровано! ${blocks.length} блоков`);
  }, [originalMessage, publicKey, textToBlocks, CODE_LENGTH]);

  // ----------- ДЕШИФРОВАНИЕ -----------
  const handleDecrypt = useCallback(() => {
    if (!encryptedOutput || !privateKey.P.length) {
      showStatus(
        "❌ Сначала сгенерируйте ключи и введите зашифрованные данные"
      );
      return;
    }

    try {
      const encryptedBlocks = stringToEncryptedData(encryptedOutput);
      const { P, G, S_inv } = privateKey;
      const P_inverse = invertPermutationMatrix(P);

      const decryptedBlocks = encryptedBlocks.map(({ encrypted }) => {
        const y_prime = multiplyVectorMatrix(encrypted, P_inverse);
        const mS = decodeWithErrorCorrection(y_prime, G, publicKey.t);
        const originalBlock = multiplyVectorMatrix(mS, S_inv);
        return originalBlock;
      });

      const decryptedText = blocksToText(decryptedBlocks);
      setResult(decryptedText);
      showStatus("✅ Сообщение успешно расшифровано!");
    } catch (error) {
      console.error("Ошибка дешифрования:", error);
      showStatus("❌ Ошибка при дешифровании");
      setResult("Ошибка дешифрования");
    }
  }, [
    encryptedOutput,
    privateKey,
    blocksToText,
    publicKey.t,
    decodeWithErrorCorrection,
  ]);

  const handleProcess = () =>
    mode === "encrypt" ? handleEncrypt() : handleDecrypt();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(encryptedOutput);
    showStatus("📋 Скопировано в буфер обмена!");
  };

  const resetDemo = () => {
    setPublicKey({ G_prime: [], t: 0 });
    setPrivateKey({ S: [], G: [], P: [], S_inv: [] });
    setEncryptedOutput("");
    setResult("");
    showStatus("🔄 Демонстрация сброшена");
  };

  return (
    <div className="lab-content">
      <h2>Алгоритм Мак-Элиса</h2>

      <div className="lab-controls">
        <div className="mode-selector">
          <label className="radio-label">
            <input
              type="radio"
              value="encrypt"
              checked={mode === "encrypt"}
              onChange={(e) => setMode(e.target.value)}
            />
            🔒 Шифрование
          </label>
          <label className="radio-label">
            <input
              type="radio"
              value="decrypt"
              checked={mode === "decrypt"}
              onChange={(e) => setMode(e.target.value)}
            />
            🔓 Дешифрование
          </label>
        </div>

        {mode === "encrypt" ? (
          <div className="input-group">
            <label>Исходное сообщение:</label>
            <textarea
              value={originalMessage}
              onChange={(e) => setOriginalMessage(e.target.value)}
              placeholder="Введите текст для шифрования"
              className="text-area"
              rows="3"
            />
          </div>
        ) : (
          <div className="input-group">
            <label>Зашифрованные данные:</label>
            <textarea
              value={encryptedOutput}
              onChange={(e) => setEncryptedOutput(e.target.value)}
              placeholder="Вставьте сюда зашифрованные данные"
              className="text-area"
              rows="3"
            />
          </div>
        )}

        <div className="button-group">
          <button onClick={generateKeys} className="generate-btn">
            🔑 Сгенерировать ключи
          </button>
          <button onClick={handleProcess} className="process-btn">
            {mode === "encrypt" ? "🔒 Зашифровать" : "🔓 Расшифровать"}
          </button>
          {mode === "encrypt" && encryptedOutput && (
            <button onClick={copyToClipboard} className="generate-btn">
              📋 Копировать
            </button>
          )}
          <button onClick={resetDemo} className="generate-btn">
            🗑️ Сбросить
          </button>
        </div>

        {status && <div className="status-message">{status}</div>}

        <div className="visualization">
          {publicKey.G_prime.length > 0 && (
            <div className="step-card">
              <h3>🔑 Параметры системы</h3>
              <div className="matrix-display">
                <strong>Размер блока:</strong> {BLOCK_SIZE} бит
                <br />
                <strong>Длина кода:</strong> {CODE_LENGTH} бит
                <br />
                <strong>Макс. ошибок:</strong> {publicKey.t}
                <br />
                <strong>Режим:</strong>{" "}
                {mode === "encrypt" ? "Шифрование" : "Дешифрование"}
              </div>
            </div>
          )}

          {mode === "encrypt" && encryptedOutput && (
            <div className="step-card">
              <h3>🔒 Результат шифрования</h3>
              <div className="encrypted-data">
                <strong>Зашифрованные данные:</strong>
                <div className="output-text">{encryptedOutput}</div>
                <small style={{ color: "#00d4ff", fontSize: "0.8rem" }}>
                  Скопируйте эти данные для дешифрования
                </small>
              </div>
            </div>
          )}

          {result && (
            <div className="step-card">
              <h3>{mode === "encrypt" ? "📊 Статус" : "🔓 Результат"}</h3>
              <div className="result-display">
                {mode === "encrypt" ? (
                  <div>
                    <strong>Статус:</strong> {result}
                    <br />
                    <strong>Данные готовы для копирования</strong>
                  </div>
                ) : (
                  <div>
                    <strong>Расшифрованный текст:</strong>
                    <br />
                    <div className="decrypted-text">"{result}"</div>
                    {originalMessage && mode === "decrypt" && (
                      <div style={{ marginTop: "0.5rem" }}>
                        <strong>Совпадение с исходным:</strong>
                        <span
                          style={{
                            color:
                              result === originalMessage
                                ? "#00ff88"
                                : "#ff4444",
                            marginLeft: "0.5rem",
                            fontWeight: "bold",
                          }}
                        >
                          {result === originalMessage
                            ? "✅ Полное совпадение!"
                            : "❌ Есть расхождения"}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Lab4;
