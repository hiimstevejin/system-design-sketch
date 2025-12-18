"use client";

import { useState } from "react";
import { Wand2Icon, Loader2, X } from "lucide-react";

type AiGeneratorProps = {
    onGenerate: (prompt: string) => Promise<void>;
    isGenerating: boolean;
    onClose: () => void;
};

export default function AiGenerator({
    onGenerate,
    isGenerating,
    onClose,
}: AiGeneratorProps) {
    const [prompt, setPrompt] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;
        onGenerate(prompt);
    };

    return (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
            <div className="bg-white rounded-xl shadow-2xl border border-indigo-100 overflow-hidden">
                {/* Header */}
                <div className="bg-indigo-600 p-4 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-white">
                        <Wand2Icon className="w-5 h-5" />
                        <span className="font-semibold">Magic Diagram</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe a system (e.g., 'A video streaming service like Netflix with load balancers, CDN, and database')..."
                        className="w-full h-32 p-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                        autoFocus
                    />

                    <button
                        type="submit"
                        disabled={isGenerating || !prompt.trim()}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white py-2.5 rounded-lg font-medium transition-colors"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Dreaming up architecture...
                            </>
                        ) : (
                            "Generate Diagram"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
