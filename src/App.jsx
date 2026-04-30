import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileUp, FileImage, FileStack, Download, X, Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'
import confetti from 'canvas-confetti'
import { jsPDF } from 'jspdf'
import * as pdfjsLib from 'pdfjs-dist'

// Set up PDF.js worker using a reliable CDN for v4+
// pdfjs-dist 4.x uses .mjs for the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

function App() {
  const [mode, setMode] = useState('imageToPdf') // 'imageToPdf' or 'pdfToImage'
  const [files, setFiles] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)

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

    setFiles(prev => [...prev, ...validFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }))])
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
        const x = (pageWidth - width) / 2
        const y = (pageHeight - height) / 2
        
        pdf.addImage(imgData, 'JPEG', x, y, width, height)
        setProgress(Math.round(((i + 1) / files.length) * 100))
      }

      pdf.save('converted-images.pdf')
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4f46e5', '#8b5cf6', '#ec4899']
      })
    } catch (err) {
      console.error('PDF generation failed:', err)
      setError('PDF creation failed. Please check your images and try again.')
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
      
      // Load PDF
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
      const pdf = await loadingTask.promise
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 2.5 }) // Higher scale for better quality
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        canvas.height = viewport.height
        canvas.width = viewport.width

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        }
        
        await page.render(renderContext).promise
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        const link = document.createElement('a')
        link.href = imgData
        link.download = `${fileObj.file.name.replace('.pdf', '')}-page-${i}.jpg`
        link.click()
        
        setProgress(Math.round((i / pdf.numPages) * 100))
      }

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4f46e5', '#8b5cf6', '#ec4899']
      })
    } catch (err) {
      console.error('PDF to Image failed:', err)
      setError('Failed to convert PDF. The file might be corrupted or protected.')
    } finally {
      setIsProcessing(false)
    }
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
    <div className="animate-fade-in">
      <header>
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-block p-5 rounded-3xl bg-indigo-50 mb-6 shadow-sm border border-indigo-100"
        >
          <Sparkles className="w-12 h-12 text-indigo-600" />
        </motion.div>
        <h1>CHKK Converter</h1>
        <p className="subtitle">Premium PDF & Image transformation tool for CHKK</p>
      </header>

      <main className="max-w-4xl mx-auto">
        {/* Mode Toggle */}
        <div className="glass-panel mb-8 p-1.5 flex gap-1.5 w-fit mx-auto rounded-2xl border-slate-200 shadow-lg">
          <button 
            className={`btn ${mode === 'imageToPdf' ? '' : 'btn-secondary shadow-none border-transparent'}`}
            onClick={() => { setMode('imageToPdf'); setFiles([]); setError(null); }}
          >
            <FileStack className="w-5 h-5" />
            Images to PDF
          </button>
          <button 
            className={`btn ${mode === 'pdfToImage' ? '' : 'btn-secondary shadow-none border-transparent'}`}
            onClick={() => { setMode('pdfToImage'); setFiles([]); setError(null); }}
          >
            <FileImage className="w-5 h-5" />
            PDF to Images
          </button>
        </div>

        {/* Upload Zone */}
        <div className="glass-panel">
          <div 
            className="upload-zone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => document.getElementById('file-input').click()}
          >
            <input 
              id="file-input"
              type="file" 
              multiple={mode === 'imageToPdf'} 
              accept={mode === 'imageToPdf' ? "image/*" : ".pdf"}
              className="hidden"
              onChange={handleFileSelect}
            />
            <div className="flex flex-col items-center gap-6">
              <div className="p-6 rounded-full bg-indigo-50 text-indigo-600 shadow-inner">
                <FileUp className="w-16 h-16" />
              </div>
              <div>
                <h3 className="text-2xl font-black mb-2 text-slate-800">
                  {mode === 'imageToPdf' ? 'Upload Images' : 'Upload PDF File'}
                </h3>
                <p className="text-slate-500 font-medium">
                  {mode === 'imageToPdf' 
                    ? 'Drag and drop your JPG or PNG images here' 
                    : 'Select a PDF document to extract pages as JPG'}
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center gap-3 font-bold text-sm"
              >
                <AlertCircle className="w-5 h-5" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* File List */}
          <AnimatePresence>
            {files.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-10 space-y-4"
              >
                <div className="flex justify-between items-center px-2">
                  <span className="font-bold text-slate-600 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                    {files.length} file{files.length > 1 ? 's' : ''} ready
                  </span>
                  <button onClick={() => setFiles([])} className="text-sm font-bold text-slate-400 hover:text-rose-500 transition-colors">
                    Remove all
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {files.map(f => (
                    <motion.div 
                      key={f.id}
                      layout
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow group"
                    >
                      {f.preview ? (
                        <img src={f.preview} className="w-14 h-14 rounded-xl object-cover shadow-sm" alt="preview" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-indigo-50 flex items-center justify-center">
                          <FileImage className="w-7 h-7 text-indigo-600" />
                        </div>
                      )}
                      <div className="flex-1 text-left overflow-hidden">
                        <p className="text-sm font-bold text-slate-800 truncate">{f.file.name}</p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{(f.file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                        className="p-2 rounded-xl hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-10">
                  <button 
                    disabled={isProcessing}
                    onClick={mode === 'imageToPdf' ? convertImageToPdf : convertPdfToImage}
                    className="btn w-full justify-center text-xl py-5 rounded-2xl"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-7 h-7 animate-spin" />
                        Processing... {progress}%
                      </>
                    ) : (
                      <>
                        <Download className="w-7 h-7" />
                        Start Conversion
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="mt-20 pb-10 text-slate-400 text-sm font-medium">
        <p>&copy; 2026 CHKK PDF & Image Tool. All rights reserved.</p>
        <div className="flex items-center justify-center gap-6 mt-4">
          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Secure Processing</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> No Data Uploaded</span>
        </div>
      </footer>
    </div>
  )
}

export default App
