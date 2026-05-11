import React, { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './ui/Button'
import { convertToWebP } from '@/lib/imageUpload'

interface ImageUploaderProps {
  images: string[]
  onImagesChange: (images: string[]) => void
  maxImages?: number
  className?: string
}

export function ImageUploader({ images, onImagesChange, maxImages = 9, className }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isConverting, setIsConverting] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      processFiles(files)
    }
  }

  // 将文件转换为 WebP 并返回 base64
  const convertToWebPPreview = async (file: File): Promise<string> => {
    try {
      // 如果已经是 WebP，直接读取
      if (file.type === 'image/webp') {
        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve(e.target?.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      }
      
      // 转换为 WebP
      const webpFile = await convertToWebP(file)
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.onerror = reject
        reader.readAsDataURL(webpFile)
      })
    } catch (error) {
      console.warn('WebP 转换失败，使用原图:', error)
      // 转换失败时使用原图
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    }
  }

  const processFiles = async (files: FileList) => {
    const remainingSlots = maxImages - images.length
    const filesToProcess = Array.from(files).slice(0, remainingSlots)
    
    setIsConverting(true)
    
    for (const file of filesToProcess) {
      if (file.type.startsWith('image/')) {
        try {
          const base64 = await convertToWebPPreview(file)
          onImagesChange([...images, base64])
        } catch (error) {
          console.error('图片处理失败:', error)
        }
      }
    }
    
    setIsConverting(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files) {
      processFiles(files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const removeImage = (index: number) => {
    const newImages = [...images]
    newImages.splice(index, 1)
    onImagesChange(newImages)
  }

  return (
    <div className={className}>
      <div
        className={cn(
          'relative border-2 border-dashed rounded-xl p-6 transition-all duration-200',
          isDragging ? 'border-primary bg-primary/5' : 'border-dark-100 hover:border-primary/50'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        
        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 rounded-full bg-dark-100 flex items-center justify-center mb-4">
              <Upload className={cn('w-8 h-8 text-slate-400', isConverting && 'animate-pulse')} />
            </div>
            <p className="text-slate-400 mb-2">{isConverting ? '正在转换为 WebP...' : '点击或拖拽上传图片'}</p>
            <p className="text-slate-500 text-sm">{isConverting ? '请稍候' : `最多上传 ${maxImages} 张图片（自动优化为 WebP 格式）`}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => inputRef.current?.click()}
              disabled={isConverting}
            >
              选择图片
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {images.map((image, index) => (
                <div key={index} className="relative group aspect-square rounded-lg overflow-hidden bg-dark-100">
                  <img
                    src={image}
                    alt={`上传图片 ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {index === 0 && (
                    <span className="absolute bottom-1 left-1 px-2 py-0.5 bg-primary text-white text-xs rounded">
                      封面
                    </span>
                  )}
                </div>
              ))}
              {images.length < maxImages && (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-dark-100 hover:border-primary/50 flex flex-col items-center justify-center text-slate-400 hover:text-primary transition-colors"
                >
                  <ImageIcon className="w-8 h-8 mb-2" />
                  <span className="text-sm">添加图片</span>
                </button>
              )}
            </div>
            <p className="text-slate-500 text-sm text-center">
              已上传 {images.length}/{maxImages} 张图片（自动优化为 WebP 格式），第一张将作为封面
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
