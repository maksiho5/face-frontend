import Image from 'next/image';
import { log } from 'node:console';
import React, { useState } from 'react'
import * as faceapi from "face-api.js";
import axios from 'axios';
interface FileData {
    _id: string;
    filename: string;
    path: string;
    name?: string
    __v?: number;
}
interface CreatedImage {
    file: FileData;
    message: string
}

  
 
  function CreateFace({ labeledFaceDescriptors, faces, setFces }: { labeledFaceDescriptors: faceapi.LabeledFaceDescriptors[], faces: FileData[], setFces: React.Dispatch<React.SetStateAction<FileData[]>> }) {
  
    const [selectedFile, setSelectedFile] = useState<File | string | Blob>('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [buttonsUpload, setButtonsUpload] = useState<"flex" | "hidden">("hidden");
    const [nameFace, setNameFace] = useState<string>("");


    const addFile = (event: React.ChangeEvent<HTMLInputElement>) => {


        const file = event.target.files?.[0];


        if (file) {
            setSelectedFile(file);
            setImagePreview(URL.createObjectURL(file));

        }
        if (file && nameFace) {
            setButtonsUpload("flex")
        } else {
            setButtonsUpload("hidden")
        }
    }

    const backFile = () => {
        setSelectedFile('');
        setNameFace('')
        setImagePreview(null);
        setButtonsUpload("hidden")
    }
    const getNameFace = (e) => {
        setNameFace(e.target.value)
        if (selectedFile && nameFace) {
            setButtonsUpload("flex")
        } else {
            setButtonsUpload("hidden")
        }
    }
    const loadFile = async () => {
        // const img = await faceapi.bufferToImage(selectedFile);
        // const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);
        // const detections = await faceapi
        //     .detectAllFaces(img)
        //     .withFaceLandmarks()
        //     .withFaceDescriptors();


        // const results = detections.map((detection) => {
        //     const data = faceMatcher.findBestMatch(detection.descriptor).toString();
        //     return data.split(' ')[0]

        // })



        // if (detections.length > 1 || detections.length == 0) {
        //     alert("На изоброжении должен быть один человек")
        //     return;
        // }


        // if (results[0] !== "unknown") {
        //     alert("Такой человек уже есть в базе")
        // }
        try {
            const dataInformation = new FormData()
            dataInformation.append('file', selectedFile)
            dataInformation.append('name', nameFace)
            const data = await axios.post<CreatedImage>('https://backend-face-production.up.railway.app/image/uploadFile', dataInformation)

            alert(data.data.message)
            console.log(data.data.file);

            
        } catch (error) {
            alert(error)
        }




    }


    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center  ">

            <div className="flex items-center justify-center w-full gap-y-5 flex-col ">
                {imagePreview ?
                    <Image
                        src={imagePreview}
                        alt="Uploaded"
                        className=" max-w-80"

                    /> :
                    <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-54 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <svg className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                            </svg>
                            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Нажмите, чтобы загрузить</span> или перетащите</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">SVG, PNG, JPG</p>
                        </div>
                        <input id="dropzone-file" type="file" className="hidden" onChange={e => addFile(e)} />
                    </label>
                }
                <div className="flex w-full">
                    <input type="text" className='font-semibold  text-[13px] text-black flex bg-white p-2 rounded-[13px] w-full ' placeholder='Ведите имя человека' onChange={(e) => getNameFace(e)} value={nameFace} />

                </div>
            </div>


            <div className={`${buttonsUpload} gap-2 relative top-10 `}>
                <button type="button" className="text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700" onClick={backFile}>Назад</button>
                <button type="button" className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800" onClick={loadFile}>Загрузить</button>

            </div>

        </div>
    )
}

export default CreateFace