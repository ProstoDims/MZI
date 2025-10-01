import React, { useState, useRef } from "react";
import "./Lab8.css";

const Lab8 = () => {
  const [mode, setMode] = useState("hide");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);
  const [originalImage, setOriginalImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);

  // Храним оригинальные данные для демонстрации
  const [demoData, setDemoData] = useState(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setOriginalImage(e.target.result);
        setStatus(
          mode === "hide"
            ? "Исходное изображение загружено"
            : "Изображение для извлечения загружено"
        );
        setProcessedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Улучшенный метод сокрытия с использованием PNG для сохранения битов
  const hideMessageInImage = (imageData, text) => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageDataObj = ctx.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        );
        const data = imageDataObj.data;

        // Конвертируем текст в биты с заголовком
        const textBits = textToBits(text);
        const lengthBits = numberToBits(text.length, 32);
        const allBits = [...lengthBits, ...textBits];

        // Проверяем вместимость
        const availableBits = Math.floor(data.length / 4) * 3; // 3 канала на пиксель (RGB)
        if (allBits.length > availableBits) {
          resolve({
            success: false,
            error: `Сообщение слишком длинное. Максимум: ${Math.floor(
              availableBits / 16
            )} символов`,
          });
          return;
        }

        // Встраиваем биты в младшие биты
        let bitIndex = 0;
        for (let i = 0; i < data.length && bitIndex < allBits.length; i++) {
          // Используем только RGB каналы, пропускаем Alpha
          if (i % 4 !== 3) {
            data[i] = (data[i] & 0xfe) | allBits[bitIndex];
            bitIndex++;
          }
        }

        ctx.putImageData(imageDataObj, 0, 0);

        // Сохраняем как PNG для сохранения точности битов
        const processedDataUrl = canvas.toDataURL("image/png");

        // Сохраняем данные для демонстрации
        setDemoData({
          message: text,
          bits: allBits,
          image: processedDataUrl,
        });

        resolve({
          success: true,
          imageData: processedDataUrl,
          message: `Сообщение скрыто! (${text.length} символов)`,
        });
      };

      img.src = imageData;
    });
  };

  const extractMessageFromImage = (imageData) => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageDataObj = ctx.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        );
        const data = imageDataObj.data;

        try {
          // Извлекаем длину сообщения (32 бита)
          let lengthBits = [];
          let pixelIndex = 0;

          for (let i = 0; i < data.length && lengthBits.length < 32; i++) {
            if (i % 4 !== 3) {
              // Только RGB каналы
              lengthBits.push(data[i] & 1);
              pixelIndex = i;
            }
          }

          const messageLength = bitsToNumber(lengthBits);

          // Проверяем корректность длины
          if (messageLength === 0 || messageLength > 10000) {
            resolve({ success: false, error: "Сообщение не найдено" });
            return;
          }

          // Извлекаем само сообщение
          let messageBits = [];
          let bitsExtracted = 0;
          const totalBitsNeeded = messageLength * 16;

          // Продолжаем с того места, где остановились
          for (
            let i = pixelIndex + 1;
            i < data.length && bitsExtracted < totalBitsNeeded;
            i++
          ) {
            if (i % 4 !== 3) {
              messageBits.push(data[i] & 1);
              bitsExtracted++;
            }
          }

          if (bitsExtracted < totalBitsNeeded) {
            resolve({
              success: false,
              error: "Сообщение повреждено или неполное",
            });
            return;
          }

          const extractedMessage = bitsToText(messageBits);

          resolve({
            success: true,
            message: extractedMessage,
            length: extractedMessage.length,
          });
        } catch (error) {
          resolve({ success: false, error: "Ошибка при извлечении сообщения" });
        }
      };

      img.onerror = () => {
        resolve({ success: false, error: "Ошибка загрузки изображения" });
      };

      img.src = imageData;
    });
  };

  // Вспомогательные функции
  const textToBits = (text) => {
    const bits = [];
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      // Используем 16 бит на символ для поддержки Unicode
      for (let j = 15; j >= 0; j--) {
        bits.push((charCode >> j) & 1);
      }
    }
    return bits;
  };

  const bitsToText = (bits) => {
    let text = "";
    for (let i = 0; i < bits.length; i += 16) {
      if (i + 16 > bits.length) break;

      let charCode = 0;
      for (let j = 0; j < 16; j++) {
        charCode = (charCode << 1) | bits[i + j];
      }
      text += String.fromCharCode(charCode);
    }
    return text;
  };

  const numberToBits = (number, bitCount) => {
    const bits = [];
    for (let i = bitCount - 1; i >= 0; i--) {
      bits.push((number >> i) & 1);
    }
    return bits;
  };

  const bitsToNumber = (bits) => {
    let number = 0;
    for (let i = 0; i < bits.length; i++) {
      number = (number << 1) | bits[i];
    }
    return number;
  };

  const processImage = async () => {
    if (!originalImage) {
      setStatus("Пожалуйста, загрузите изображение");
      return;
    }

    setIsProcessing(true);
    setStatus("Обработка...");

    try {
      if (mode === "hide") {
        if (!message.trim()) {
          setStatus("Введите сообщение для сокрытия");
          setIsProcessing(false);
          return;
        }

        const result = await hideMessageInImage(originalImage, message);

        if (result.success) {
          setProcessedImage(result.imageData);
          setStatus(result.message);
        } else {
          setStatus(result.error || "Ошибка при сокрытии сообщения");
        }
      } else {
        const result = await extractMessageFromImage(originalImage);

        if (result.success) {
          setMessage(result.message);
          setStatus(
            `✅ Сообщение успешно извлечено! (${result.length} символов)`
          );
        } else {
          setStatus(`❌ ${result.error}`);
        }
      }
    } catch (error) {
      console.error("Processing error:", error);
      setStatus("Ошибка при обработке изображения");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = () => {
    if (processedImage) {
      const link = document.createElement("a");
      link.href = processedImage;
      link.download = "stego_image.png"; // Сохраняем как PNG
      link.click();
    }
  };

  const clearAll = () => {
    setMessage("");
    setStatus("");
    setOriginalImage(null);
    setProcessedImage(null);
    setDemoData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Функция для быстрого тестирования
  const testExtraction = () => {
    if (demoData && demoData.image) {
      setMode("extract");
      setOriginalImage(demoData.image);
      setStatus("Загружено тестовое изображение со скрытым сообщением");
    }
  };

  return (
    <div className="lab-content">
      <h2>Стеганография в изображениях</h2>

      <div className="lab-info">
        <p>
          <strong>Важно:</strong> Используйте PNG форматы для сохранения
          точности. JPEG сжатие разрушает скрытые сообщения!
        </p>

        <div className="algorithm-steps">
          <h4>Как использовать:</h4>
          <ol>
            <li>
              Для сокрытия: загрузите изображение, введите сообщение, скачайте
              PNG результат
            </li>
            <li>
              Для извлечения: загрузите PNG изображение со скрытым сообщением
            </li>
            <li>Избегайте JPEG форматов - они разрушают скрытые данные</li>
          </ol>
        </div>
      </div>

      <div className="lab-controls">
        <div className="mode-selector">
          <label className="radio-label">
            <input
              type="radio"
              name="mode"
              value="hide"
              checked={mode === "hide"}
              onChange={(e) => {
                setMode(e.target.value);
                clearAll();
              }}
            />
            Сокрытие сообщения
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="mode"
              value="extract"
              checked={mode === "extract"}
              onChange={(e) => {
                setMode(e.target.value);
                clearAll();
              }}
            />
            Извлечение сообщения
          </label>
        </div>

        <div className="input-group">
          <label>
            {mode === "hide"
              ? "Исходное изображение (PNG):"
              : "Изображение для извлечения (PNG):"}
          </label>
          <input
            type="file"
            accept=".png,.jpg,.jpeg"
            onChange={handleFileSelect}
            ref={fileInputRef}
            className="text-input"
          />
          <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>
            Рекомендуется использовать PNG для сохранения качества
          </div>
        </div>

        {mode === "hide" && (
          <div className="input-group">
            <label>Сообщение для сокрытия:</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Введите текст для сокрытия в изображении"
              className="text-area"
              rows="3"
            />
            <div
              style={{
                fontSize: "0.8rem",
                color: "rgba(255,255,255,0.6)",
                marginTop: "0.3rem",
              }}
            >
              Длина: {message.length} символов (максимум ~
              {Math.floor((originalImage ? 100000 : 50000) / 16)})
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            className="process-btn"
            onClick={processImage}
            disabled={isProcessing || !originalImage}
            style={{ flex: 1 }}
          >
            {isProcessing
              ? "Обработка..."
              : mode === "hide"
              ? "Скрыть сообщение"
              : "Извлечь сообщение"}
          </button>
        </div>

        {mode === "extract" && message && (
          <div className="input-group">
            <label>Извлеченное сообщение:</label>
            <textarea
              value={message}
              readOnly
              className="text-area output"
              rows="3"
            />
            <div
              style={{
                fontSize: "0.8rem",
                color: "#00ff88",
                marginTop: "0.3rem",
              }}
            >
              ✅ Успешно извлечено {message.length} символов
            </div>
          </div>
        )}

        {status && (
          <div
            className={`status-message ${status.includes("❌") ? "error" : ""}`}
          >
            {status}
          </div>
        )}

        {processedImage && mode === "hide" && (
          <div className="input-group">
            <button
              className="process-btn"
              onClick={downloadImage}
              style={{ width: "100%" }}
            >
              📥 Скачать PNG изображение со скрытым сообщением
            </button>

            {demoData && (
              <button
                className="generate-btn"
                onClick={testExtraction}
                style={{ width: "100%", marginTop: "0.5rem" }}
              >
                🔍 Протестировать извлечение этого сообщения
              </button>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {originalImage && (
            <div className="image-preview">
              <h4>
                {mode === "hide"
                  ? "Исходное изображение:"
                  : "Загруженное изображение:"}
              </h4>
              <img src={originalImage} alt="Original" className="preview-img" />
            </div>
          )}

          {processedImage && mode === "hide" && (
            <div className="image-preview">
              <h4>Изображение со скрытым сообщением:</h4>
              <img
                src={processedImage}
                alt="Processed"
                className="preview-img"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Lab8;
