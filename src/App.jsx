import { useState, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// PDF worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// APNAR RENDER URL
const API_BASE_URL = 'https://fixensysign.onrender.com';

function App() {
  const [pdfFile, setPdfFile] = useState(null);
  const [signs, setSigns] = useState([]);
  const [link, setLink] = useState('');
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  const generateLink = async () => {
    if (!pdfFile) return alert("Please upload a PDF first!");
    if (signs.length === 0) return alert("Please mark at least one signature position!");
    
    setLoading(true);
    
    try {
        const formData = new FormData();
        formData.append('pdfFile', pdfFile);
        
        // 1. PDF Upload to Render
        const uploadRes = await fetch(`${API_BASE_URL}/upload-pdf`, { 
            method: 'POST', 
            body: formData 
        });
        const uploadData = await uploadRes.json();
        
        if (uploadData.error) {
            alert("Upload error: " + uploadData.error);
            setLoading(false);
            return;
        }

        // 2. Link Generation on Render
        const linkRes = await fetch(`${API_BASE_URL}/generate-link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                pdfPath: uploadData.pdfPath, 
                signs: signs
            })
        });
        const linkData = await linkRes.json();
        
        if (linkData.id) {
            // Live deployment-e window.location.origin use kora best
            const generatedLink = `${window.location.origin}/sign/${linkData.id}`;
            setLink(generatedLink);
            alert("Link generated successfully!");
        }
    } catch (err) { 
        alert("Server error! Make sure Render is awake."); 
        console.error(err);
    }
    
    setLoading(false);
  };

  const handlePdfClick = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    // Percent calculation
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setSigns([...signs, { x, y, page: pageNumber }]);
  };

  const deleteSign = (index) => {
    setSigns(signs.filter((_, i) => i !== index));
  };

  return (
    <div style={{ textAlign: 'center', padding: '20px', background: '#f4f4f4', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ color: '#333' }}>📝 PDF Signature Setup (Live)</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <input 
          type="file" 
          accept="application/pdf" 
          onChange={(e) => { 
            setPdfFile(e.target.files[0]); 
            setSigns([]); 
            setPageNumber(1); 
            setLink('');
          }} 
          style={{ marginRight: '10px', padding: '10px' }}
        />
        <button 
          onClick={generateLink}
          disabled={loading || !pdfFile || signs.length === 0}
          style={{
            padding: '10px 20px',
            background: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none', borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer', fontSize: '16px'
          }}
        >
          {loading ? 'Generating...' : 'Generate Link'}
        </button>
      </div>

      {link && (
        <div style={{ padding: '15px', background: '#d4edda', borderRadius: '5px', marginBottom: '20px' }}>
          <strong>🔗 Share this link with Signer:</strong>
          <br />
          <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff', fontSize: '18px' }}>
            {link}
          </a>
        </div>
      )}

      <div style={{ margin: '20px' }}>
        <button onClick={() => setPageNumber(Math.max(1, pageNumber - 1))} disabled={pageNumber <= 1} style={{ padding: '8px 16px' }}>◀ Prev</button>
        <span style={{ margin: '0 15px', fontSize: '18px' }}>Page {pageNumber} of {numPages || '?'}</span>
        <button onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))} disabled={pageNumber >= numPages} style={{ padding: '8px 16px' }}>Next ▶</button>
      </div>

      <div 
        ref={containerRef}
        style={{ position: 'relative', display: 'inline-block', cursor: 'crosshair', border: '3px solid #333', background: 'white' }}
        onClick={handlePdfClick}
      >
        {pdfFile && (
          <Document file={pdfFile} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
            <Page pageNumber={pageNumber} width={800} renderTextLayer={false} renderAnnotationLayer={false} />
          </Document>
        )}
        
        {signs.filter(s => s.page === pageNumber).map((s, i) => (
          <div 
            key={i}
            style={{ position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, transform: 'translate(-50%, -50%)', zIndex: 999 }}
          >
            <div 
              style={{ background: '#ff0000', color: 'white', padding: '8px 15px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); deleteSign(signs.indexOf(s)); }}
            >
              ✍️ Sign {i + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;