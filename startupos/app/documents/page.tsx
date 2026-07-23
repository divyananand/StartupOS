"use client"
import {useState,useEffect} from "react"
export default function Documents()
{
    const[title,setTitle] = useState("")
    const[docType,setDocType] = useState("pitch-deck")
    const[content,setContent] = useState("")
    const[documents,setDocuments] = useState([])

    useEffect(()=>{
        fetchDocuments()
    },[])       

    async function fetchDocuments()
    {
        fetch("http://localhost:8000/documents")
        .then((res)=>res.json())
        .then((data)=>setDocuments(data))
    }

    async function handleSubmit(e: React.FormEvent)
    {

        e.preventDefault();

        await fetch("http://localhost:8000/documents",{
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body: JSON.stringify({
                title:title, doc_type:docType, content:content})
            }
        )

        setTitle("")
        setDocType("pitch-deck")
        setContent("")
        fetchDocuments()
    }

    return(
        <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-6 px-6 pt-8">Documents</h1>
            <form className="px-6 max-w-lg" onSubmit={handleSubmit}>
                <label>Title</label>

                <input className="border border-gray-300 rounded-md px-3 py-2 w-full mt-1 mb-4"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />


                <label>Document Type</label>
                <select className="border border-gray-300 rounded-md px-3 py-2 w-full mt-1 mb-4"
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                >
                    <option value="pitch-deck">Pitch Deck</option>
                    <option value="sop">SOP</option>
                    <option value="brief">Brief</option>    
                </select>

                <label>Content</label>
                <textarea className="border border-gray-300 rounded-md px-3 py-2 w-full mt-1 mb-4"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}></textarea>

                    <button 
                    type="submit"
                    className="bg-gray-900 text-white px-5 py-2 rounded-md text-sm"
                    >
                        Create Document
                    </button>
            </form>

                <div className="px-6 mt-6">
                    {documents.map((doc: any, index: number) => (
                        <div key={index} className="border p-3 mb-2 rounded-md">
                            <h3 className="font-semibold">{doc.title}</h3>
                            <p className="text-sm text-gray-600">{doc.doc_type}</p>
                            <p className="text-sm">{doc.content}</p>
                        </div>
                    ))}
                </div>
        </div>
    )
}