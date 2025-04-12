import { useState, useRef, ChangeEvent } from "react";
import * as faceapi from "face-api.js";
import Image from "next/image";

interface FileData {
  _id: string;
  filename: string;
  path: string;
  name?: string;
  __v?: number;
}

interface FaceRecognitionProps {
  trainingLoaded: boolean;
  faces: FileData[];
  labeledFaceDescriptors: faceapi.LabeledFaceDescriptors[];
  learningLoaded: boolean;
}

const FaceRecognition: React.FC<FaceRecognitionProps> = ({
  trainingLoaded,
  faces,
  labeledFaceDescriptors,
  learningLoaded,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [matchResults, setMatchResults] = useState<FileData[]>([]);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
      setMatchResults([]);

      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx && canvasRef.current.width && canvasRef.current.height) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const recognizeFaces = async () => {
    try {
      if (!selectedFile) return alert("Загрузите изображение!");

      const img = await faceapi.bufferToImage(selectedFile);
      const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);

      const detections = await faceapi
        .detectAllFaces(img)
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections.length === 0) {
        setMatchResults([{ _id: "unknown", filename: "", path: "", name: "❌ Лица не найдены" }]);
        return;
      }

      const results: FileData[] = detections
        .map((detection) => {
          const bestMatch = faceMatcher.findBestMatch(detection.descriptor).toString();
          const matchName = bestMatch.split(" ")[0];

          if (matchName === "unknown") {
            return {
              _id: "unknown",
              filename: "",
              path: "",
              name: "Лицо не найдено",
            };
          }

          const matchedFace = faces.find((face) => face.filename === matchName);
          return matchedFace ?? {
            _id: "unknown",
            filename: "",
            path: "",
            name: "Лицо не найдено",
          };
        })
        .filter(Boolean) as FileData[];

      setMatchResults(results);

      // Рисуем рамки
      const canvas = canvasRef.current;
      const imgElement = imageRef.current;
      if (!canvas || !imgElement) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      faceapi.matchDimensions(canvas, imgElement);
      const resizedDetections = faceapi.resizeResults(detections, imgElement);
      faceapi.draw.drawDetections(canvas, resizedDetections);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4">
      <h1 className="text-3xl font-bold mb-4">🦸‍♂️ Определить лица</h1>

      {/* Выбор файла */}
      <input type="file" className="mb-4 p-2 bg-gray-700 rounded" onChange={handleFileChange} />

      {learningLoaded ? (
        <button
          className="px-4 py-2 bg-gray-500 text-gray-300 cursor-not-allowed"
          onClick={recognizeFaces}
          disabled={!selectedFile}
        >
          {trainingLoaded ? "⟳ Загрузка данных" : "⟳ Загрузка моделей"}
        </button>
      ) : (
        <button
          className={`px-4 py-2 ${selectedFile ? "bg-blue-600 hover:bg-blue-500 rounded transition" : "rounded-lg transition-all bg-gray-600"}`}
          onClick={recognizeFaces}
          disabled={!selectedFile}
        >
          {selectedFile ? "🔍 Распознать" : "Загрузите изображение"}
        </button>
      )}

      {/* Превью загруженного изображения */}
      {imagePreview && (
        <div className="relative mt-6 w-85">
          <Image
            src={imagePreview}
            alt="Uploaded"
            className="max-w-full rounded shadow-lg w-30px h-30px"
            ref={imageRef}
            width={500}
            height={500}
          />
          <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
        </div>
      )}

      {/* Результаты */}
      <div className="mt-6 p-4 bg-gray-800 rounded shadow-lg w-full max-w-md">
        <h2 className="text-xl font-semibold">🎯 Результаты:</h2>
        <ul className="mt-2">
          {matchResults.map((result, index) => (
            <li key={index} className="p-2 bg-gray-700 rounded mt-1">
              {result.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default FaceRecognition;
