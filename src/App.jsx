import React, { useState } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { 
  FileUp, FileImage, FileStack, Download, X, Loader2, 
  Sparkles, CheckCircle2, AlertCircle, Trash2, 
  FileText, LayoutDashboard, History, Zap, GripVertical 
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { jsPDF } from 'jspdf'
import * as pdfjsLib from 'pdfjs-dist'
import JSZip from 'jszip'

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

function App() {
  const [mode, setMode] = useState('pdfToImage')
  const [files, setFiles] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [outputType, setOutputType] = useState('zip')

  const handleFileDrop = (e) => {
    e.preventDefault()
    setError(null)
    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFiles(droppedFiles)
  }

  const handleFileSelect = (e) => {
    setError(null)
    const selectedFiles = Array.from(e.target.files)
    handleFiles(selectedFiles)
  }

  const handleFiles = (newFiles) => {
    const validFiles = newFiles.filter(file => {
      if (mode === 'imageToPdf') {
        return file.type.startsWith('image/')
      } else {
        return file.type === 'application/pdf'
      }
    })
    
    if (validFiles.length === 0 && newFiles.length > 0) {
      setError(`Please select ${mode === 'imageToPdf' ? 'images (JPG/PNG)' : 'a PDF file'}.`)
      return
    }

    if (mode === 'pdfToImage' && validFiles.length > 0) {
      setFiles([{
        file: validFiles[0],
        id: Math.random().toString(36).substr(2, 9),
        preview: null
      }])
    } else {
      // For images, we create previews
      const filesWithPreviews = validFiles.map(file => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        preview: URL.createObjectURL(file)
      }))
      setFiles(prev => [...prev, ...filesWithPreviews])
    }
  }

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const convertImageToPdf = async () => {
    if (files.length === 0) return
    setIsProcessing(true)
    setProgress(0)
    setError(null)

    try {
      const pdf = new jsPDF()
      for (let i = 0; i < files.length; i++) {
        const fileObj = files[i]
        const imgData = await readFileAsDataURL(fileObj.file)
        const img = new Image()
        img.src = imgData
        await new Promise(resolve => img.onload = resolve)
        
        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()
        if (i > 0) pdf.addPage()
        
        const ratio = Math.min(pageWidth / img.width, pageHeight / img.height)
        const width = img.width * ratio
        const height = img.height * ratio
        pdf.addImage(imgData, 'JPEG', (pageWidth - width) / 2, (pageHeight - height) / 2, width, height)
        setProgress(Math.round(((i + 1) / files.length) * 100))
      }
      pdf.save('chkk-output.pdf')
      triggerConfetti()
    } catch (err) {
      setError('Failed to create PDF. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const convertPdfToImage = async () => {
    if (files.length === 0) return
    setIsProcessing(true)
    setProgress(0)
    setError(null)

    try {
      const fileObj = files[0]
      const arrayBuffer = await fileObj.file.arrayBuffer()
      const zip = outputType === 'zip' ? new JSZip() : null
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
      const pdf = await loadingTask.promise
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 2.5 })
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        canvas.height = viewport.height
        canvas.width = viewport.width
        await page.render({ canvasContext: context, viewport: viewport }).promise
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        const fileName = `${fileObj.file.name.replace('.pdf', '')}-p${i}.jpg`

        if (outputType === 'zip') {
          zip.file(fileName, imgData.split(',')[1], { base64: true })
        } else {
          const link = document.createElement('a')
          link.href = imgData
          link.download = fileName
          link.click()
        }
        setProgress(Math.round((i / pdf.numPages) * 100))
      }

      if (outputType === 'zip') {
        const content = await zip.generateAsync({ type: 'blob' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(content)
        link.download = `${fileObj.file.name.replace('.pdf', '')}-images.zip`
        link.click()
      }
      triggerConfetti()
    } catch (err) {
      setError('PDF conversion failed.')
    } finally {
      setIsProcessing(false)
    }
  }

  const triggerConfetti = () => {
    confetti({
      particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#29b27a', '#2edb8b', '#ffffff']
    })
  }

  const readFileAsDataURL = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Zap className="w-8 h-8 text-[#29b27a]" fill="#29b27a" />
          <span>CHKK AI</span>
        </div>
        <nav>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-4">Tools</div>
          <div className={`nav-item ${mode === 'pdfToImage' ? 'active' : ''}`} onClick={() => { setMode('pdfToImage'); setFiles([]); setError(null); }}>
            <FileImage className="w-5 h-5" /> PDF to Images
          </div>
          <div className={`nav-item ${mode === 'imageToPdf' ? 'active' : ''}`} onClick={() => { setMode('imageToPdf'); setFiles([]); setError(null); }}>
            <FileStack className="w-5 h-5" /> Images to PDF
          </div>
        </nav>
        <div className="mt-auto px-3 py-4 text-[10px] text-slate-400 font-bold border-t border-slate-200">CHKK PDF v0.1.1</div>
      </aside>

      <main className="main-content">
        <div className="header-section">
          <h1>{mode === 'pdfToImage' ? 'Extract images from PDF' : 'Create PDF from images'}</h1>
          <p>The smartest way to transform your documents instantly.</p>
        </div>

        <div className="workspace-card">
          {mode === 'pdfToImage' && (
            <div className="settings-group mb-8">
              <div className="settings-title">Export Settings</div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={outputType === 'zip'} onChange={() => setOutputType('zip')} className="accent-[#29b27a] w-4 h-4" />
                  <span className="text-sm font-medium">Download as ZIP</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={outputType === 'individual'} onChange={() => setOutputType('individual')} className="accent-[#29b27a] w-4 h-4" />
                  <span className="text-sm font-medium">Individual JPGs</span>
                </label>
              </div>
            </div>
          )}

          {!files.length ? (
            <div className="dropzone" onDragOver={(e) => e.preventDefault()} onDrop={handleFileDrop} onClick={() => document.getElementById('file-input').click()}>
              <input id="file-input" type="file" multiple={mode === 'imageToPdf'} accept={mode === 'imageToPdf' ? "image/*" : ".pdf"} className="hidden" onChange={handleFileSelect} onClick={(e) => e.stopPropagation()} />
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-[#e9f7f1] rounded-full flex items-center justify-center mb-6">
                  <FileUp className="text-[#29b27a] w-8 h-8" />
                </div>

                <h3 className="text-xl font-bold mb-2">{mode === 'pdfToImage' ? 'Upload your PDF' : 'Upload your images'}</h3>
                <p className="text-slate-500 text-sm">Drag and drop or click to browse</p>
              </div>
            </div>
          ) : mode === 'imageToPdf' && (
            <div className="flex justify-center mb-8">
              <button 
                onClick={() => document.getElementById('file-input-more').click()}
                className="btn-secondary"
              >
                <FileUp className="w-4 h-4" />
                Add More Images
                <input id="file-input-more" type="file" multiple accept="image/*" className="hidden" onChange={handleFileSelect} onClick={(e) => e.stopPropagation()} />
              </button>
            </div>
          )}



          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-4 rounded-lg bg-red-50 text-red-600 text-sm font-medium flex items-center gap-3 border border-red-100">
                <AlertCircle className="w-5 h-5" /> {error}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {files.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-10">
                <div className="flex justify-between items-center mb-6 px-2">
                  <h4 className="text-sm font-bold text-slate-700">Selected Items ({files.length})</h4>
                  <button onClick={() => setFiles([])} className="text-xs font-bold text-slate-400 hover:text-red-500">Clear all</button>
                </div>
                
                {mode === 'imageToPdf' ? (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400 font-bold mb-4 uppercase tracking-wider">Drag cards to reorder pages</p>
                    <Reorder.Group axis="y" values={files} onReorder={setFiles} className="space-y-4">
                      {files.map((f, index) => (
                        <Reorder.Item key={f.id} value={f} className="page-card">
                          <div className="page-number">{index + 1}</div>
                          <GripVertical className="grip-icon" />
                          <div className="thumbnail-container">
                            {f.preview && <img src={f.preview} className="thumbnail-img" alt="preview" />}
                          </div>
                          <div className="page-info-container">
                            <div className="page-name">{f.file.name}</div>
                            <div className="page-meta">Page {index + 1} • {(f.file.size / 1024 / 1024).toFixed(2)} MB</div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); removeFile(f.id); }} className="remove-page-btn">
                            <X className="w-4 h-4" />
                          </button>
                        </Reorder.Item>
                      ))}

                    </Reorder.Group>
                  </div>
                ) : (
                  <div className="border border-slate-100 rounded-lg overflow-hidden">
                    {files.map(f => (
                      <div key={f.id} className="file-row">
                        <FileText className="w-5 h-5 text-[#29b27a] mr-4" />
                        <div className="file-row-info">
                          <div className="file-row-name">{f.file.name}</div>
                          <div className="file-row-meta">{(f.file.size / 1024 / 1024).toFixed(2)} MB</div>
                        </div>
                        <button onClick={() => removeFile(f.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col items-center mt-10">
                  <button disabled={isProcessing} onClick={mode === 'imageToPdf' ? convertImageToPdf : convertPdfToImage} className="btn-primary w-full max-w-sm h-14 text-lg">
                    {isProcessing ? <><Loader2 className="w-6 h-6 animate-spin" /> Processing... {progress}%</> : <><Zap className="w-6 h-6" fill="currentColor" /> Convert and Download</>}
                  </button>
                  {isProcessing && <div className="progress-track max-w-sm mt-4"><div className="progress-fill" style={{ width: `${progress}%` }}></div></div>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

export default App
