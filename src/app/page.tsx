"use client";

import React, { useState, useRef, useEffect } from "react";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as faceapi from 'face-api.js';
import FaceRecognition from "@/components/FaceRecognition/FaceRecognition ";
import CreateFace from "@/components/CreateFace/CreateFace";
import axios from "axios";

const genderTranslations: Record<string, string> = {
  male: "Мужчина",
  female: "Женщина",
};

const emotionTranslations: Record<string, string> = {
  angry: "Злой",
  disgusted: "Отвращение",
  fearful: "Испуганный",
  happy: "Счастливый",
  neutral: "Нейтральный",
  sad: "Грустный",
  surprised: "Удивлённый",
};

interface FileData {
  _id: string;
  filename: string;
  path: string;
  name?: string;
  __v?: number;
}
interface EmotionDetectionProps {
  modelsLoaded: boolean;
}

const App = () => {
  const [mode, setMode] = useState("emotion");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [learningLoaded, setLearningLoaded] = useState(false);
  const [faces, setFces] = useState<FileData[]>([]);
  const [trainingLoaded, setTrainingLoaded] = useState(false);
  const [labeledFaceDescriptors, setLabeledFaceDescriptors] = useState<faceapi.LabeledFaceDescriptors[] | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri("/face-frontend/models");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/face-frontend/models");
        await faceapi.nets.faceRecognitionNet.loadFromUri("/face-frontend/models");
        await faceapi.nets.ageGenderNet.loadFromUri("/face-frontend/models");
        await faceapi.nets.faceExpressionNet.loadFromUri("/face-frontend/models");
        setModelsLoaded(true);
        setLearningLoaded(true);
        setTrainingLoaded(true)
        console.log("Модели загружены!");
      } catch (error) {
        console.error("Ошибка загрузки моделей:", error);
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (!modelsLoaded) return;

    const loadLabeledImages = async () => {
      try {
        const getFace = await axios.get<FileData[]>("https://backend-face-production.up.railway.app/image/getFace");
        setFces(getFace.data);

        const labeledDescriptors = await Promise.all(
          getFace.data.map(async (data) => {
            const descriptions = [];
            const imgUrl = data.path;
            try {
              const img = await faceapi.fetchImage(imgUrl);
              const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

              if (detections) descriptions.push(detections.descriptor);
              setLearningLoaded(false);
            } catch (err) {
              console.error(`Ошибка при загрузке изображения ${imgUrl}:`, err);
            }
            return new faceapi.LabeledFaceDescriptors(data.filename, descriptions);
          })
        );
        setLabeledFaceDescriptors(labeledDescriptors);
      } catch (err) {
        console.error("Ошибка загрузки лиц:", err);
      }
    };

    loadLabeledImages();
  }, [modelsLoaded]);

  return (
    <div className="flex flex-col items-center gap-6 p-6 bg-gray-900 min-h-screen text-white">
      <h1 className="text-3xl font-bold text-blue-400 text-center">Face AI</h1>
      <div className="flex gap-4">
        <button
          onClick={() => setMode("emotion")}
          className={`px-6 py-2 rounded-lg transition-all ${mode === "emotion" ? "bg-blue-500" : "bg-gray-600"}`}
        >
          Определение эмоций
        </button>
        <button
          onClick={() => setMode("recognition")}
          className={`px-6 py-2 rounded-lg transition-all ${mode === "recognition" ? "bg-blue-500" : "bg-gray-600"}`}
        >
          Распознавание по фото
        </button>
        <button
          onClick={() => setMode("addFace")}
          className={`px-6 py-2 rounded-lg transition-all ${mode === "addFace" ? "bg-blue-500" : "bg-gray-600"}`}
        >
          Загрузить фото
        </button>
      </div>
      {mode === "emotion" ? (
        <EmotionDetection modelsLoaded={modelsLoaded} />
      ) : mode === "addFace" ? (
        <CreateFace  />
      ) : (
        <FaceRecognition  faces={faces} trainingLoaded={trainingLoaded} labeledFaceDescriptors={labeledFaceDescriptors ?? []} learningLoaded={learningLoaded} />
      )}
    </div>
  );
};

const EmotionDetection: React.FC<EmotionDetectionProps> = ({ modelsLoaded }) => {
  const [emotion, setEmotion] = useState<string | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCamera = async () => {
    if (!modelsLoaded) return;
    try {
      const userStream = await navigator.mediaDevices.getUserMedia({ video: {} });
      if (videoRef.current) {
        videoRef.current.srcObject = userStream;
        streamRef.current = userStream;
        setIsCameraOn(true);
        startFaceDetection();
      }
    } catch (err) {
      console.error("Ошибка доступа к камере:", err);
    }
  };

  const startFaceDetection = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(async () => {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        if (video.videoWidth === 0 || video.videoHeight === 0) {
          console.warn("Видео еще не загружено, пропускаем кадр...");
          return;
        }

        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceExpressions()
          .withAgeAndGender();

        faceapi.matchDimensions(canvas, video);

        ctx?.clearRect(0, 0, canvas.width, canvas.height);
        const resizedDetections = faceapi.resizeResults(detections, {
          width: video.videoWidth,
          height: video.videoHeight,
        });

        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

        if (detections.length > 0) {
          const { age, gender, expressions } = detections[0];

          setAge(Math.round(age));
          setGender(genderTranslations[gender] || gender);

          const dominantEmotion = Object.keys(expressions).reduce((a, b) =>
            expressions[a as keyof typeof expressions] > expressions[b as keyof typeof expressions] ? a : b
          );

          setEmotion(emotionTranslations[dominantEmotion] || dominantEmotion);
        } else {
          setEmotion(null);
          setAge(null);
          setGender(null);
        }
      }
    }, 1000);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsCameraOn(false);
    setEmotion(null);
    setAge(null);
    setGender(null);
  };

  return (
    <div className="flex flex-col items-center gap-6 p-6 bg-gray-900 min-h-screen text-white">
      <h1 className="text-3xl font-bold text-blue-400 text-center">Распознавание лиц</h1>

      <div className="relative w-full max-w-lg h-[480px] border-4 border-blue-400 rounded-lg overflow-hidden">
        <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
        <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
      </div>

      <div className="flex flex-col items-center text-lg bg-gray-800 p-4 rounded-lg shadow-md w-full max-w-lg text-center">
        {emotion && <p className="text-yellow-300 font-semibold">Эмоция: {emotion}</p>}
        {age !== null && <p className="text-green-300 font-semibold">Возраст: {age} лет</p>}
        {gender && <p className="text-purple-300 font-semibold">Пол: {gender}</p>}
      </div>

      <div className="flex gap-4">
        {!isCameraOn ? (
          <button
            onClick={startCamera}
            disabled={!modelsLoaded}
            className={`px-6 py-2 rounded-lg shadow-lg transition-all ${modelsLoaded ? "bg-green-500 hover:bg-green-600 text-white" : "bg-gray-500 text-gray-300 cursor-not-allowed"}`}
          >
            {modelsLoaded ? "Включить камеру" : "Загрузка моделей..."}
          </button>
        ) : (
          <button
            onClick={stopCamera}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg shadow-lg transition-all"
          >
            Остановить камеру
          </button>
        )}
      </div>
    </div>
  );
};

export default App;
