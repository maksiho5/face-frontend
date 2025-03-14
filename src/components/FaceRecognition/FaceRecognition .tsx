import { useEffect, useState, useRef } from "react";
import * as faceapi from "face-api.js";
import { log } from "console";

const labels = [
    "Джереми Реннер",
    "Дмитрий Назаров",
    "Дориан Хэрвуд",
    "Дуэйн Джонсон",
    "Крис Хемсворт",
    "Крис Эванс",
    "Кэрол Дэнверс",
    "Роберт Дауни-младший",
    "Скарлетт Йоханссон",
    "Cергей Безруков"
];

function FaceRecognition() {
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [labeledFaceDescriptors, setLabeledFaceDescriptors] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [matchResults, setMatchResults] = useState([]);
    const imageRef = useRef(null);
    const canvasRef = useRef(null);

    // 📌 Загружаем модели FaceAPI.js
    useEffect(() => {
        const loadModels = async () => {
            const MODEL_URL = "/models";
            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ]);
            setModelsLoaded(true);
        };
        loadModels();
    }, []);

    // 📌 Загружаем обученные изображения героев Marvel (с локального сервера)
    useEffect(() => {
        if (!modelsLoaded) return;

        const loadLabeledImages = async () => {
            return Promise.all(
                labels.map(async (label) => {
                    const descriptions = [];
                    // Перебираем несколько форматов: jpg и png
                    for (let i = 1; i <= 2; i++) {
                        try {
                            const imgUrls = [
                                `https://192.168.0.113:3000/labeled_images/${label}/${i}.jpg`,
                                `https://192.168.0.113:3000/labeled_images/${label}/${i}.png`,
                            ];

                            for (const imgUrl of imgUrls) {
                                try {
                                    const img = await faceapi.fetchImage(imgUrl);
                                    const detections = await faceapi
                                        .detectSingleFace(img)
                                        .withFaceLandmarks()
                                        .withFaceDescriptor();
                                    if (detections) descriptions.push(detections.descriptor);
                                    break; // Если изображение найдено и обработано, выходим из цикла
                                } catch (err) {
                                    console.log(`Ошибка при загрузке изображения ${imgUrl}:`, err);
                                }
                            }
                        } catch (e) {
                            console.log(e);

                        }

                    }
                    return new faceapi.LabeledFaceDescriptors(label, descriptions);
                })
            );
        };

        loadLabeledImages().then(setLabeledFaceDescriptors);
    }, [modelsLoaded]);

    // 📌 Обрабатываем загрузку нового изображения
    const handleFileChange = (event) => {

        try {
            const file = event.target.files[0];


            setSelectedFile(file);
            setImagePreview(URL.createObjectURL(file));
            setMatchResults([]); // Очищаем старые результаты

            // Очищаем холст перед загрузкой нового изображения
            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext("2d");
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
        } catch (e) {
            console.log(e);

        }

    };

    const recognizeFaces = async () => {

        try {
            if (!selectedFile ) return alert("Загрузи изображение!");

            const img = await faceapi.bufferToImage(selectedFile);
            const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);

            const detections = await faceapi
                .detectAllFaces(img)
                .withFaceLandmarks()
                .withFaceDescriptors();

            if (detections.length === 0) {
                setMatchResults(["❌ Лица не найдены"]);
                return;
            }

            // Ищем лучшие совпадения для каждого лица
            const results = detections.map((detection) =>
                faceMatcher.findBestMatch(detection.descriptor).toString()
            );
            if (results[0].split(' ')[0] == "unknown") {
                setMatchResults(["❌ Лица не найдены"]);
                return;
            }

            setMatchResults(results);

            // 📌 Рисуем рамки
            const canvas = canvasRef.current;
            const imgElement = imageRef.current;
            if (!canvas || !imgElement) return;

            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            faceapi.matchDimensions(canvas, imgElement);
            const resizedDetections = faceapi.resizeResults(detections, imgElement);
            faceapi.draw.drawDetections(canvas, resizedDetections);
        } catch (e) {
            console.log(e);

        }

    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4">
            <h1 className="text-3xl font-bold mb-4">🦸‍♂️ Определить лица</h1>

            {/* Выбор файла */}
            <input type="file" className="mb-4 p-2 bg-gray-700 rounded" onChange={handleFileChange} />
            <button
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded transition"
                onClick={recognizeFaces}
                disabled={!selectedFile}
            >
                🔍 Распознать
            </button>

            {/* Превью загруженного изображения */}
            {imagePreview && (
                <div className="relative mt-6 w-85">
                    <img
                        src={imagePreview}
                        alt="Uploaded"
                        className="max-w-full rounded shadow-lg w-30px h-30px"
                        ref={imageRef}
                    />
                    <canvas
                        ref={canvasRef}
                        className="absolute top-0 left-0 w-full h-full"
                    />
                </div>
            )}

            {/* Результаты */}
            <div className="mt-6 p-4 bg-gray-800 rounded shadow-lg w-full max-w-md">
                <h2 className="text-xl font-semibold">🎯 Результаты:</h2>
                <ul className="mt-2">
                    {matchResults.map((result, index) => (
                        <li key={index} className="p-2 bg-gray-700 rounded mt-1">
                            {result}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default FaceRecognition;
