import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import SignatureCanvas from 'react-signature-canvas';

// PDF worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// APNAR RENDER URL
const API_BASE_URL = 'https://fixensysign.onrender.com';

function SignerPage() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [loading, setLoading] = useState(false);
  const sigRefs = useRef({});

  useEffect(() => {
    // Localhost bodle API_BASE_URL theke doc data ana holo
    fetch(`${API_BASE_URL}/doc/${id}`)
      .then(res => res.json())
      .then(data => setDoc(data))
      .catch(err => console.error(err));
  }, [id]);

  const handleSubmit = async () => {
    if (!doc) return;
    setLoading(true);

    const signatures = [];
    for (let i = 0; i < doc.signs.length; i++) {
      const ref = sigRefs.current[i];
      if (ref && !ref.isEmpty()) {
        signatures.push(ref.getCanvas().toDataURL('image/png'));
      } else {
        signatures.push(null);
      }
    }

    if (signatures.includes(null)) {
      alert("Please sign all fields!");
      setLoading(false);
      return;
    }

    try {
      // Signatures submit kora hochche Render server-e
      const res = await fetch(`${API_BASE_URL}/submit-sign/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureImages: signatures })
      });
      
      const data = await res.json();
      
      if (data.pdf) {
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${data.pdf}`;
        link.download = 'signed.pdf';
        link.click();
        alert("Done! Check your email.");
      }
    } catch (err) {
      alert("Error submitting signature!");
    }

    setLoading(false);
  };

  if (!doc) return <h2 style={{ textAlign: 'center', marginTop: '50px' }}>Loading Document...</h2>;

  return (
    <div style={{ background: '#eee', minHeight: '100vh', padding: '20px' }}>
      <button 
        onClick={handleSubmit}
        disabled={loading}
        style={{
          position: 'fixed', top: 20, right: 20,
          padding: '15px 30px', background: 'green', color: 'white',
          border: 'none', borderRadius: '5px', fontSize: '16px',
          cursor: loading ? 'not-allowed' : 'pointer', zIndex: 1000
        }}
      >
        {loading ? 'Processing...' : '✅ Finish & Download'}
      </button>

      <h2 style={{ textAlign: 'center' }}>✍️ Sign at marked positions</h2>

      {/* PDF file-ti Render server-er upload folder theke ana hochche */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Document 
          file={`${API_BASE_URL}/upload/${doc.pdfPath}`}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        >
          {Array.from(new Array(numPages), (_, pageIndex) => (
            <div key={pageIndex} style={{ 
              position: 'relative', margin: '20px auto', 
              background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              width: 'fit-content'
            }}>
              <Page 
                pageNumber={pageIndex + 1} 
                width={800} 
                renderTextLayer={false} 
                renderAnnotationLayer={false} 
              />
              
              {doc.signs.map((sign, i) => {
                if (sign.page !== pageIndex + 1) return null;
                
                return (
                  <div key={i} style={{
                    position: 'absolute',
                    left: `${sign.x}%`,
                    top: `${sign.y}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10
                  }}>
                    <SignatureCanvas
                      ref={el => sigRefs.current[i] = el}
                      canvasProps={{
                        width: 180,
                        height: 70,
                        style: { border: '2px solid blue', borderRadius: '5px', background: 'white' }
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}

export default SignerPage;