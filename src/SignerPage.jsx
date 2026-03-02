import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import SignatureCanvas from 'react-signature-canvas';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const API_BASE_URL = 'https://fixensysign.onrender.com';

function SignerPage() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [loading, setLoading] = useState(false);
  const sigRefs = useRef({});

  useEffect(() => {
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
      if (ref && !ref.isEmpty()) signatures.push(ref.getCanvas().toDataURL('image/png'));
      else signatures.push(null);
    }

    if (signatures.includes(null)) {
      alert("Please sign all fields!");
      setLoading(false);
      return;
    }

    try {
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
        alert("Done!");
      }
    } catch (err) { alert("Error!"); }
    setLoading(false);
  };

  if (!doc) return <h2 style={{ textAlign: 'center' }}>Loading...</h2>;

  // FIX: Cloudinary URL check 
  const pdfUrl = doc.pdfPath.startsWith('http') 
    ? doc.pdfPath 
    : `${API_BASE_URL}/upload/${doc.pdfPath}`;

  return (
    <div style={{ background: '#eee', minHeight: '100vh', padding: '20px' }}>
      <button onClick={handleSubmit} disabled={loading} style={{ position: 'fixed', top: 20, right: 20, padding: '10px 20px', background: 'green', color: 'white', zIndex: 1000 }}>
        {loading ? 'Processing...' : '✅ Finish'}
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Document file={pdfUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
          {Array.from(new Array(numPages), (_, pageIndex) => (
            <div key={pageIndex} style={{ position: 'relative', margin: '20px auto', background: 'white', width: 'fit-content' }}>
              <Page pageNumber={pageIndex + 1} width={800} renderTextLayer={false} renderAnnotationLayer={false} />
              {doc.signs.map((sign, i) => {
                if (sign.page !== pageIndex + 1) return null;
                return (
                  <div key={i} style={{ position: 'absolute', left: `${sign.x}%`, top: `${sign.y}%`, transform: 'translate(-50%, -50%)', zIndex: 10 }}>
                    <SignatureCanvas ref={el => sigRefs.current[i] = el} canvasProps={{ width: 180, height: 70, style: { border: '2px solid blue', background: 'white' } }} />
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