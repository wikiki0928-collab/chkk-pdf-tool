import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileUp, FileImage, FileStack, Download, X, Loader2, Sparkles } from 'lucide-react'
import confetti from 'canvas-confetti'
import { jsPDF } from 'jspdf'
import * as pdfjsLib from 'pdfjs-dist'

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

function App() {
  const [mode, setMode] = useState('imageToPdf') // 'imageToPdf' or 'pdfToImage'
  const [files, setFiles] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFileDrop = (e) => {
    e.preventDefault()
    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFiles(droppedFiles)
  }

  const handleFileSelect = (e) => {
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

    try {
      const pdf = new jsPDF()
      
      for (let i = 0; i < files.length; i++) {
        const fileObj = files[i]
        const imgData = await readFileAsDataURL(fileObj.file)
        
        // Simple page sizing logic
        const img = new Image()
        img.src = imgData
        await new Promise(resolve => img.onload = resolve)
        
        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()
        
        if (i > 0) pdf.addPage()
        
        // Scale image to fit page
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
        colors: ['#6366f1', '#a855f7', '#ec4899']
      })
    } catch (error) {
      console.error('PDF generation failed:', error)
      alert('Conversion failed. Please try again.')
    } finally {
      setIsProcessing(false)
      setProgress(0)
    }
  }

  const convertPdfToImage = async () => {
    if (files.length === 0) return
    setIsProcessing(true)
    setProgress(0)

    try {
      const fileObj = files[0] // Only process first PDF for now
      const arrayBuffer = await fileObj.file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 2.0 })
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        canvas.height = viewport.height
        canvas.width = viewport.width

        await page.render({ canvasContext: context, viewport }).promise
        
        const imgData = canvas.toDataURL('image/jpeg', 0.9)
        const link = document.createElement('a')
        link.href = imgData
        link.download = `page-${i}.jpg`
        link.click()
        
        setProgress(Math.round((i / pdf.numPages) * 100))
      }

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      })
    } catch (error) {
      console.error('PDF to Image failed:', error)
      alert('Conversion failed. Please try again.')
    } finally {
      setIsProcessing(false)
      setProgress(0)
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
          className="inline-block p-4 rounded-3xl bg-indigo-500/10 mb-6"
        >
          <Sparkles className="w-12 h-12 text-indigo-400" />
        </motion.div>
        <h1>CHKK Converter</h1>
        <p className="subtitle">High-performance PDF & Image transformation tool</p>
      </header>

      <main className="max-w-4xl mx-auto">
        {/* Mode Toggle */}
        <div className="glass-panel mb-8 p-2 flex gap-2 w-fit mx-auto rounded-2xl">
          <button 
            className={`btn ${mode === 'imageToPdf' ? '' : 'btn-secondary'}`}
            onClick={() => { setMode('imageToPdf'); setFiles([]); }}
          >
            <FileStack className="w-5 h-5" />
            Images to PDF
          </button>
          <button 
            className={`btn ${mode === 'pdfToImage' ? '' : 'btn-secondary'}`}
            onClick={() => { setMode('pdfToImage'); setFiles([]); }}
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
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-indigo-500/10 text-indigo-400">
                <FileUp className="w-12 h-12" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">
                  Click or drag {mode === 'imageToPdf' ? 'images' : 'PDF'} here
                </h3>
                <p className="text-slate-400">
                  {mode === 'imageToPdf' 
                    ? 'JPG, PNG, WebP supported. Max 50 files.' 
                    : 'Select a PDF document to convert to high-quality JPGs.'}
                </p>
              </div>
            </div>
          </div>

          {/* File List */}
          <AnimatePresence>
            {files.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-8 space-y-3"
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="font-medium text-slate-300">
                    {files.length} file{files.length > 1 ? 's' : ''} selected
                  </span>
                  <button onClick={() => setFiles([])} className="text-sm text-slate-500 hover:text-white transition-colors">
                    Clear all
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {files.map(f => (
                    <motion.div 
                      key={f.id}
                      layout
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 group"
                    >
                      {f.preview ? (
                        <img src={f.preview} className="w-12 h-12 rounded-lg object-cover" alt="preview" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                          <FileImage className="w-6 h-6 text-indigo-400" />
                        </div>
                      )}
                      <div className="flex-1 text-left overflow-hidden">
                        <p className="text-sm font-medium truncate">{f.file.name}</p>
                        <p className="text-xs text-slate-500">{(f.file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-8">
                  <button 
                    disabled={isProcessing}
                    onClick={mode === 'imageToPdf' ? convertImageToPdf : convertPdfToImage}
                    className="btn w-full justify-center text-lg py-4 shadow-indigo-500/20"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Processing... {progress}%
                      </>
                    ) : (
                      <>
                        <Download className="w-6 h-6" />
                        Convert to {mode === 'imageToPdf' ? 'PDF' : 'Images'}
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="mt-20 text-slate-500 text-sm">
        <p>&copy; 2026 CHKK PDF & Image Tool. All rights reserved.</p>
        <p className="mt-2">Privacy focused: No files leave your browser.</p>
      </footer>
    </div>
  )
}

export default App
