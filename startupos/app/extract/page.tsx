"use client"
import {useState} from "react";

export default function ExtractPage() {
    const [text,setText] = useState("");
    const [result,setResult] = useState<any>(null);

    async function handleSubmit()
    {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/extract`,{
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body: JSON.stringify({
                text
            })
    })

    const data = await response.json();
    setResult(data);
    }
    return(
        <div>
            <h1>Meeting Extractor</h1>
                <textarea className="border border-gray-300 rounded-md px-3 py-2 w-full mt-1 mb-4"
            value={text}
            onChange={(e)=>setText(e.target.value)}>
            </textarea>

            <button 
                    type="submit"
                    className="bg-gray-900 text-white px-5 py-2 rounded-md text-sm"
                    onClick={handleSubmit}
                    >
                        Extract
                    </button>   
            
            {result && (
            <div className="px-6 mt-6">
                <h2 className="text-xl font-bold mb-4">
                    Extracted Results
                </h2>

                {result.result.tasks.map((task:any,index:number)=>
                (
                    <div key = {index}>
                        <h3>{task.title}</h3>
                        <p>Owner: {task.owner}</p>
                        <p>Priority: {task.priority}</p>
                        <p>Deadline: {task.deadline}</p>
                    </div>
                ))}

                {result.result.blockers.map((block:any,index:number)=>
                (
                    <p key={index}>
                        {block}
                    </p>
                ))}

                {result.result.decisions.map((decision:any, index:number) => 
                (
                    <p key={index}>
                        {decision}
                    </p>
                ))}
            </div>
        )}

        </div>
        
    );
}


