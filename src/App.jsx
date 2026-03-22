import React, { useState, useEffect, useRef } from 'react';
import { CONFIG } from './config';
import { Search, FileText, Upload, BookOpen, Loader2, Book, Key, X, Library, Download, CheckSquare, Menu } from 'lucide-react';
import localforage from 'localforage';
import * as pdfjsLib from 'pdfjs-dist';
import ePub from 'epubjs';
import ReactMarkdown from 'react-markdown';

// Setup PDF worker using unpkg CDN to bypass Vite module resolution errors
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedChunks, setSelectedChunks] = useState([]);
  
  // Modal Content State
  const [generatedContent, setGeneratedContent] = useState(null);
  const [isGeneratedBook, setIsGeneratedBook] = useState(false);
  const [generatedBookTitle, setGeneratedBookTitle] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [isLoadingUpload, setIsLoadingUpload] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false); // For Article
  const [isGeneratingBook, setIsGeneratingBook] = useState(false);
  const [bookGenerationStep, setBookGenerationStep] = useState("");
  
  const [apiKey, setApiKey] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadBooks();
    const storedApiKey = localStorage.getItem('ikrawai_api_key');
    if (storedApiKey) setApiKey(storedApiKey);
  }, []);

  const handleApiKeyChange = (e) => {
    const val = e.target.value;
    setApiKey(val);
    localStorage.setItem('ikrawai_api_key', val);
  };

  const loadBooks = async () => {
    const books = await localforage.getItem('ikrawai_books') || [];
    setDocuments(books);
  };

  const chunkText = (textObj, bookTitle) => {
    const { text, location } = textObj;
    const paragraphs = text.split(/\n\s*\n|\.\s/);
    const chunks = [];
    let currentChunk = "";
    
    paragraphs.forEach(p => {
      const trimmed = p.trim();
      if (!trimmed) return;
      if (currentChunk.length + trimmed.length > 800 && currentChunk.length > 0) {
        chunks.push({ text: currentChunk, bookTitle, location, id: crypto.randomUUID() });
        currentChunk = trimmed + ". ";
      } else {
        currentChunk += (currentChunk ? " " : "") + trimmed + ". ";
      }
    });
    
    if (currentChunk.trim().length > 0) {
      chunks.push({ text: currentChunk, bookTitle, location, id: crypto.randomUUID() });
    }
    return chunks;
  };

  const processPDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullTextObjs = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      if (pageText.trim()) {
        fullTextObjs.push({ text: pageText, location: `Sayfa ${i}` });
      }
    }
    return fullTextObjs;
  };

  const processEpub = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const book = ePub(arrayBuffer);
    await book.ready;
    let fullTextObjs = [];
    const spineItems = book.spine.items || book.spine.spineItems; 
    if(spineItems) {
      for (let i = 0; i < spineItems.length; i++) {
        const item = spineItems[i];
        try {
           const doc = await book.load(item.href);
           const text = doc.body ? (doc.body.textContent || doc.body.innerText) : "";
           if (text && text.trim()) {
             fullTextObjs.push({ text: text.replace(/\s+/g, ' '), location: `Bölüm ${i + 1}` });
           }
        } catch(e) {
           console.warn("EPUB Bölüm atlandı:", e);
        }
      }
    }
    return fullTextObjs;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsLoadingUpload(true);
    const bookTitle = file.name;

    try {
      let rawTexts = [];
      const fileType = file.type;
      const fileName = file.name.toLowerCase();

      if (fileType === "application/pdf" || fileName.endsWith('.pdf')) {
        rawTexts = await processPDF(file);
      } else if (fileType === "application/epub+zip" || fileName.endsWith('.epub')) {
        rawTexts = await processEpub(file);
      } else {
        alert("Sadece PDF ve Epub desteklenmektedir.");
        setIsLoadingUpload(false);
        return;
      }

      let allChunks = [];
      rawTexts.forEach(rt => {
         const chunks = chunkText(rt, bookTitle);
         allChunks = [...allChunks, ...chunks];
      });

      const existingChunks = await localforage.getItem('ikrawai_chunks') || [];
      await localforage.setItem('ikrawai_chunks', [...existingChunks, ...allChunks]);

      const existingBooks = await localforage.getItem('ikrawai_books') || [];
      if (!existingBooks.find(b => b.title === bookTitle)) {
        existingBooks.push({ title: bookTitle, addedAt: Date.now() });
        await localforage.setItem('ikrawai_books', existingBooks);
        setDocuments(existingBooks);
      }
    } catch (error) {
      console.error(error);
      alert("Dosya işlenirken bir hata oluştu.");
    } finally {
      setIsLoadingUpload(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    if (!apiKey) {
      alert(CONFIG.UI.apiKeyMissing);
      return;
    }

    setIsSearching(true);
    setResults([]);

    try {
      const prompt = `Sen bir kelime analiz motorusun. Kullanıcının girdiği kelimenin/kelimelerin eş anlamlılarını ve bağlamsal yakınlarını Türkçe olarak bul. SADECE virgülle ayrılmış bir kelime listesi dön. Başka hiçbir giriş, çıkış, açıklama veya markdown formatı kullanma.\n\nKullanıcı girdisi: ${searchQuery}`;
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2 }
        })
      });

      if (!response.ok) throw new Error("API Hatası");
      const data = await response.json();
      let expandedQuery = data.candidates?.[0]?.content?.parts?.[0]?.text || searchQuery;
      
      expandedQuery = expandedQuery.replace(/```/g, "").trim();
      const keywords = expandedQuery.split(',').map(k => k.trim().toLowerCase()).filter(k => k && k.length > 2);
      
      const originalWords = searchQuery.toLowerCase().split(' ').filter(k => k.length > 2);
      const searchTerms = [...new Set([...keywords, ...originalWords])];

      const allChunks = await localforage.getItem('ikrawai_chunks') || [];
      const matched = allChunks.filter(chunk => {
        const textLower = chunk.text.toLowerCase();
        return searchTerms.some(term => textLower.includes(term));
      });

      setResults(matched);
    } catch (err) {
      console.error(err);
      alert(CONFIG.UI.searchError);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleChunkSelection = (chunk) => {
    setSelectedChunks(prev => {
      const exists = prev.find(c => c.id === chunk.id);
      if (exists) return prev.filter(c => c.id !== chunk.id);
      return [...prev, chunk];
    });
  };

  const handleSelectAll = () => {
    const allSelected = results.every(r => selectedChunks.some(c => c.id === r.id));
    if (allSelected) {
      setSelectedChunks(prev => prev.filter(c => !results.some(r => r.id === c.id)));
    } else {
      setSelectedChunks(prev => {
        const newChunks = [...prev];
        results.forEach(r => {
          if (!newChunks.some(c => c.id === r.id)) {
             newChunks.push(r);
          }
        });
        return newChunks;
      });
    }
  };

  // Common Gemini Caller Helper Function
  const callGemini = async (prompt, isJson = false) => {
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2 }
    };
    if (isJson) payload.generationConfig.responseMimeType = "application/json";
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error("Generative API Hatası");
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text;
  };

  const handleGenerateArticle = async () => {
    if (selectedChunks.length === 0) {
      alert("Lütfen makale oluşturmak için arama sonuçlarından metin seçin.");
      return;
    }
    if (!apiKey) {
      alert(CONFIG.UI.apiKeyMissing);
      return;
    }

    setIsGenerating(true);
    setIsGeneratedBook(false); // Flag off book

    try {
      let xmlContext = "<documents>\n";
      selectedChunks.forEach((chunk, index) => {
        xmlContext += `  <doc id="${index + 1}" title="${chunk.bookTitle}" location="${chunk.location}">\n    ${chunk.text}\n  </doc>\n`;
      });
      xmlContext += "</documents>";

      const outlinePrompt = `Seçilen metinleri oku. Bu bilgilerle insanların Google'da aratabileceği merak uyandırıcı bir ana sorun bul. 
1. SEO Odaklı Başlık: İlgi çekici ve anahtar kelime içeren bir başlık belirle.
2. Anlatı Akışı: Bilgileri 'sorun - çözüm - uygulama' ekseninde bir hikaye gibi kurgula. 
3. Kavramsal Köprü: Farklı disiplinlerin (ör. Mantık ile Din veya Girişimcilik) kavramlarını nasıl birleştireceğine dair bağlar kur.
Bana SADECE kaynak isimlerinin geçmediği, yukarıdaki yönergelere uygun 3 bölümlük bir hikaye/makale iskeleti çıkar.

Context:
${xmlContext}`;
      const outline = await callGemini(outlinePrompt);

      const synthesisPrompt = `Sen bir Bilge Anlatıcısın. Aşağıdaki iskeleti kullanarak akademik dili tamamen bırakıp, SADECE sağlanan metinlerin XML bağlamına dayanarak sürükleyici bir SEO makalesi sentezle.

İskelet:
${outline}

Kurallar (ÇOK KATI):
1. Dil Seviyesi: Ortaokul seviyesinde sade ama yetişkin ciddiyetinde vakur. Terim kullanmaktan kaçın.
2. Hikaye Anlatıcılığı (Storytelling): Cümleleri nehir gibi akıt. 'A kitabında şu yazar...' yerine 'Bilmelisin ki...' veya 'İnsan doğası...' gibi bağlayıcılar kullan. Metinleri AYRI BAŞLIKLARA BÖLME.
3. Radikal Harmanlama (Kritik): Her kısa paragraf içinde en az 2 farklı disiplinden/kaynaktan gelen fikri birleştir ve yedir.
  (Örn: "Doğru kararlar almak için zihnin kendi içinde tutarlı olması gerekir [Mantık, s.1]. Bu huzur sağlandığında kişi korkmadan yönünü seçebilir [Girişimcilik, s.2].")
4. SEO Kuralları: Başlıklarda H1, H2 kullan. Önemli vurucu cümleleri **kalın** (bold) yap. Kısa paragraflar kullan.
5. Sonuç: Metnin en sonuna listelenmiş halde 'Yararlanılan Hazineler' başlığıyla bir kaynakça ekle (Sadece XML'deki kitapları dahil et). En alta da 'Meta Açıklama:' diyerek Google aramaları için 2 cümlelik SEO özeti yaz.

Context:
${xmlContext}`;
      
      const article = await callGemini(synthesisPrompt);
      setGeneratedContent(article);
      setIsModalOpen(true);
    } catch (err) {
      console.error(err);
      alert("Makale oluşturulurken bir hata oluştu.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateBook = async () => {
    if (selectedChunks.length === 0) {
      alert("Lütfen kitap oluşturmak için arama sonuçlarından metin seçin.");
      return;
    }
    if (!apiKey) {
      alert(CONFIG.UI.apiKeyMissing);
      return;
    }

    setIsGeneratingBook(true);
    setIsGeneratedBook(false);
    setBookGenerationStep(CONFIG.UI.loadingBookStep1);

    try {
      let xmlContext = "<documents>\n";
      selectedChunks.forEach((chunk, index) => {
        xmlContext += `  <doc id="${index + 1}" title="${chunk.bookTitle}" location="${chunk.location}">\n    ${chunk.text}\n  </doc>\n`;
      });
      xmlContext += "</documents>";

      const skeletonPrompt = `Analyze the provided texts. Design a comprehensive book structure. Return ONLY a valid JSON object with this exact structure:
{
  "bookTitle": "Suggested Title",
  "forewordIdea": "Brief idea for foreword",
  "backCoverIdea": "Brief idea for back cover",
  "chapters": [
    {
      "chapterTitle": "...",
      "subtitles": ["..."],
      "description": "Detailed instruction on what to write here using the context"
    }
  ]
}

Context Texts:
${xmlContext}`;

      const jsonStr = await callGemini(skeletonPrompt, true);
      
      let skeleton;
      try {
        skeleton = JSON.parse(jsonStr.replace(/```json/g, "").replace(/```/g, "").trim());
      } catch (e) {
         throw new Error("Kitap iskeleti oluşturulamadı (JSON ayrıştırma hatası).");
      }

      setBookGenerationStep(CONFIG.UI.loadingBookStep2);

      const bookPrompt = `You are the author. Using SADECE (ONLY) the provided XML context, write the entire book based on this JSON structure: 
${JSON.stringify(skeleton, null, 2)}

Sequence to write: 
1. Kitap Adı
2. Önsöz (Foreword)
3. Chapters (Write rich, detailed content for each title/subtitle/description)
4. Arka Kapak Yazısı (Back Cover)

Constraints:
Language: Turkish. Format: Markdown. Use ONLY the provided XML context.

XML Context:
${xmlContext}`;

      const bookContent = await callGemini(bookPrompt);
      
      setGeneratedContent(bookContent);
      setIsGeneratedBook(true); 
      setGeneratedBookTitle(skeleton.bookTitle || "Sentetik_Kitap");
      setIsModalOpen(true);
      
    } catch (err) {
      console.error(err);
      alert("Kitap oluşturulurken bir hata oluştu: " + err.message);
    } finally {
      setIsGeneratingBook(false);
    }
  };

  const handleDownload = () => {
    if(!generatedContent) return;
    const blob = new Blob([generatedContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${generatedBookTitle || 'Kitap'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-30 md:hidden backdrop-blur-sm" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200 flex flex-col py-6 px-4 shadow-lg z-40 transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 shrink-0`}>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-xl md:text-2xl font-bold text-indigo-600 flex items-center justify-center gap-2 w-full">
            <BookOpen className="w-5 h-5 md:w-6 md:h-6" /> {CONFIG.APP_NAME}
          </h1>
          <button className="md:hidden text-slate-400 hover:text-slate-600 transition absolute right-4" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <input 
          type="file" 
          accept=".pdf,.epub,application/pdf,application/epub+zip" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileUpload}
        />
        <button 
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          disabled={isLoadingUpload}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg transition shadow-sm font-medium ${
            isLoadingUpload 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100'
          }`}
        >
          {isLoadingUpload ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          {CONFIG.UI.uploadPlaceholder}
        </button>

        <div className="mt-8 w-full flex-1 overflow-y-auto">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2">
            {CONFIG.UI.sidebarTitle}
          </h2>
          {documents.length === 0 ? (
            <p className="text-sm text-slate-500 italic px-2">{CONFIG.UI.noDocument}</p>
          ) : (
             <ul className="space-y-2 px-2">
              {documents.map((doc, idx) => (
                <li key={idx} className="flex items-center gap-2 bg-slate-50 p-2 border border-slate-100 rounded-md text-sm text-slate-700 shadow-sm cursor-default hover:border-slate-200 transition">
                  <Book className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="truncate" title={doc.title}>{doc.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-auto w-full pt-4 border-t border-slate-100">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Key className="w-3 h-3" /> API Key
          </label>
          <input 
            type="password"
            placeholder={CONFIG.UI.apiKeyPlaceholder}
            value={apiKey}
            onChange={handleApiKeyChange}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-700 focus:outline-none focus:border-indigo-400 focus:bg-white transition"
          />
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative z-10 w-full overflow-hidden">
        {(isLoadingUpload || isSearching || isGenerating || isGeneratingBook) && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-indigo-600">
            <Loader2 className="w-16 h-16 animate-spin mb-6" />
            <p className="text-xl font-medium animate-pulse text-center px-6">
              {isGeneratingBook 
                 ? bookGenerationStep 
                 : (isGenerating 
                     ? CONFIG.UI.loadingArticle 
                     : (isLoadingUpload ? CONFIG.UI.loadingUpload : CONFIG.UI.loadingSearch))}
            </p>
          </div>
        )}

        <header className="py-4 md:h-24 bg-white/90 backdrop-blur-md border-b border-slate-200 flex flex-col md:flex-row items-center px-4 md:px-8 shadow-sm justify-between shrink-0 gap-4">
          <div className="flex w-full md:w-auto flex-1 items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition shrink-0">
              <Menu className="w-6 h-6" />
            </button>

            <form onSubmit={handleSearch} className="relative w-full max-w-2xl flex items-center">
              <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder={CONFIG.UI.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 md:pl-12 pr-4 py-2 md:py-3 bg-slate-100 border border-slate-200 rounded-full text-sm md:text-base text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:bg-white transition shadow-inner font-medium"
              />
              <button type="submit" className="hidden">Ara</button>
            </form>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto justify-end">
            <button 
              onClick={handleGenerateArticle}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-3 py-2 md:px-5 md:py-2.5 rounded-full hover:bg-indigo-700 hover:shadow-lg transition-all shadow-md text-sm md:text-base font-semibold whitespace-nowrap"
            >
              {selectedChunks.length > 0 ? (
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold mr-1">{selectedChunks.length}</span>
              ) : (
                <FileText className="w-4 h-4 md:w-5 md:h-5" />
              )}
              {CONFIG.UI.generateArticleBtn}
            </button>
            <button 
              onClick={handleGenerateBook}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-3 py-2 md:px-5 md:py-2.5 rounded-full hover:bg-emerald-700 hover:shadow-lg transition-all shadow-md text-sm md:text-base font-semibold whitespace-nowrap"
            >
              {selectedChunks.length > 0 ? (
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold mr-1">{selectedChunks.length}</span>
              ) : (
                <Library className="w-4 h-4 md:w-5 md:h-5" />
              )}
              {CONFIG.UI.generateBookBtn}
            </button>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 md:p-8 relative bg-slate-50/50">
            {results.length === 0 && !isSearching ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                <BookOpen className="w-20 h-20 mb-6 text-slate-300 drop-shadow-sm" />
                <p className="text-lg font-medium">{CONFIG.UI.noResults}</p>
              </div>
            ) : (
                <div className="max-w-4xl mx-auto space-y-6 pb-20">
                  {results.length > 0 && (
                    <div className="flex justify-end mb-2">
                      <button 
                        onClick={handleSelectAll}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 text-sm font-semibold border border-indigo-200 rounded-lg hover:bg-indigo-100 transition shadow-sm"
                      >
                        <CheckSquare className="w-4 h-4" />
                        {results.every(r => selectedChunks.some(c => c.id === r.id)) ? CONFIG.UI.deselectAllBtn : CONFIG.UI.selectAllBtn}
                      </button>
                    </div>
                  )}
                  {results.map((result, idx) => {
                    const isSelected = selectedChunks.some(c => c.id === result.id);
                    return (
                      <div 
                        key={idx} 
                        className={`relative bg-white p-4 md:p-6 rounded-xl shadow-sm border transition hover:shadow-md ${isSelected ? 'border-indigo-400 ring-1 ring-indigo-400' : 'border-slate-200'}`}
                      >
                        <div className="absolute top-4 md:top-6 right-4 md:right-6 flex items-center gap-2 cursor-pointer" onClick={() => toggleChunkSelection(result)}>
                          <span className={`hidden sm:inline text-xs font-semibold uppercase tracking-wider ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
                            {isSelected ? 'Seçildi' : 'Seç'}
                          </span>
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            readOnly
                            className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer pointer-events-none"
                          />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4 text-xs sm:text-sm text-slate-500 font-medium pr-10 sm:pr-28">
                          <span className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100 self-start">
                            <Book className="w-4 h-4 shrink-0" />
                            <span className="truncate max-w-[200px] md:max-w-none">{result.bookTitle}</span>
                          </span>
                          <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full border border-slate-200 self-start">
                            {result.location}
                          </span>
                        </div>
                        <p className="text-sm md:text-base text-slate-700 leading-relaxed text-justify relative z-10" onClick={(e) => {
                          e.stopPropagation();
                          toggleChunkSelection(result);
                        }} style={{ cursor: "pointer" }}>
                          {result.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
            )}
        </section>

        {isModalOpen && generatedContent && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-center items-center py-10 px-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-full flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/80">
                <h2 className={`text-xl font-bold flex items-center gap-2 ${isGeneratedBook ? 'text-emerald-700' : 'text-slate-900'}`}>
                   {isGeneratedBook ? <Library className="w-6 h-6" /> : <FileText className="w-6 h-6 text-indigo-600" />}
                   {isGeneratedBook ? CONFIG.UI.bookGeneratedTitle : CONFIG.UI.articleGeneratedTitle}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 overflow-y-auto w-full mx-auto md:p-12">
                <article className="prose prose-slate prose-indigo max-w-none text-justify lg:prose-lg mx-auto">
                  <ReactMarkdown>{generatedContent}</ReactMarkdown>
                </article>
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
                <div>
                  {isGeneratedBook && (
                    <button onClick={handleDownload} className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition shadow-sm">
                      <Download className="w-5 h-5" />
                      {CONFIG.UI.downloadBookBtn}
                    </button>
                  )}
                </div>
                <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition shadow-sm">
                  {CONFIG.UI.closeBtn}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
