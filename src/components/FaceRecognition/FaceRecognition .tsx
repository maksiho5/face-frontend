import { useEffect, useState, useRef } from "react";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as faceapi from 'face-api.js';


import Image from "next/image";


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
interface FileData {
    _id: string;
    filename: string;
    path: string;
    name?: string
    __v?: number;
}
function FaceRecognition({ modelsLoaded, trainingLoaded, faces, labeledFaceDescriptors, learningLoaded }: { modelsLoaded: boolean, trainingLoaded: boolean, faces: FileData[], labeledFaceDescriptors: faceapi.LabeledFaceDescriptors[], learningLoaded: boolean }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [matchResults, setMatchResults] = useState([]);
    const imageRef = useRef(null);
    const canvasRef = useRef(null);
    const [loading, setLoading] = useState(false);





    // 📌 Обрабатываем загрузку нового изображения
    const handleFileChange = (event) => {

        try {
            const file = event.target.files[0];


            setSelectedFile(file);
            setImagePreview(URL.createObjectURL(file));
            setMatchResults([]);
            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext("2d");
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
            // setLoading(false)
        } catch (e) {
            console.log(e);

        }

    };

    const recognizeFaces = async () => {

        try {
            if (!selectedFile) return alert("Загрузи изображение!");

            const img = await faceapi.bufferToImage(selectedFile);
            const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);

            const detections = await faceapi
                .detectAllFaces(img)
                .withFaceLandmarks()
                .withFaceDescriptors();
            console.log(detections, "analysis detections");

            if (detections.length === 0) {
                setMatchResults(["❌ Лица не найдены"]);
                return;
            }

           
            const results = detections.map((detection) => {
                const data = faceMatcher.findBestMatch(detection.descriptor).toString();

                console.log(data.split(' ')[0]);
                if (data.split(' ')[0] == "unknown") {
                    return { name: "Лица не неайдено" }
                } 

                return faces.filter(el => {
                    console.log(el.filename == data.split(' ')[0]);
                    return el.filename == data.split(' ')[0];
                });
            }).flat();
            console.log(results);

            // if (results[0].split(' ')[0] == "unknown") {
            //     setMatchResults(["❌ Лица не найдены"]);
            //     return;
            // }

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

            {learningLoaded  ? <button
                className="px-4 py-2 bg-gray-500 text-gray-300 cursor-not-allowed"
                onClick={recognizeFaces}
                disabled={!selectedFile}
            >
                {trainingLoaded ? "⟳ Загрузка данных" : "⟳ Загрузка моделей"}
            </button> : <button
                className={`px-4 py-2 ${selectedFile ? "bg-blue-600 hover:bg-blue-500 rounded transition" : "rounded-lg transition-all bg-gray-600"}`}
                onClick={recognizeFaces}
                disabled={!selectedFile}
            >
                {selectedFile ? "🔍 Распознать" : "Загрузите изображение"}
            </button>}


            {/* Превью загруженного изображения */}
            {imagePreview && (
                <div className="relative mt-6 w-85">
                    <Image
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
                    {matchResults.map((result: FileData, index) => (
                        <li key={index} className="p-2 bg-gray-700 rounded mt-1">
                            {result.name}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default FaceRecognition;
