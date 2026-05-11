/**
 * 图片上传服务
 * 支持多个图床，自动重试
 * 支持自动转换为 WebP 格式
 */

// 将图片转换为 WebP 格式
export const convertToWebP = (file: File, quality = 0.85): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('无法获取 Canvas 上下文'))
        return
      }
      ctx.drawImage(img, 0, 0)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // 保持原文件名但改为 .webp 扩展名
            const webpFileName = file.name.replace(/\.\w+$/, '.webp')
            const webpFile = new File([blob], webpFileName, { type: 'image/webp' })
            console.log(`[WebP转换] ${file.name} (${(file.size / 1024).toFixed(1)}KB) → ${webpFileName} (${(blob.size / 1024).toFixed(1)}KB) 压缩率: ${((1 - blob.size / file.size) * 100).toFixed(1)}%`)
            resolve(webpFile)
          } else {
            reject(new Error('WebP 转换失败'))
          }
        },
        'image/webp',
        quality
      )
      // 释放对象 URL
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('图片加载失败'))
    }
    img.src = URL.createObjectURL(file)
  })
}

// 转换为 base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// 上传到 ImgBB
const uploadToImgBBService = async (base64: string): Promise<string> => {
  const response = await fetch('https://api.imgbb.com/1/upload?key=d1263dfd83db2d08f87b3a54ef6dff55', {
    method: 'POST',
    body: new URLSearchParams({ image: base64.split(',')[1] })
  })
  const data = await response.json()
  if (data.success) return data.data.url
  throw new Error(data.error?.message || 'ImgBB上传失败')
}

// 上传到 sm.ms（备用图床）
const uploadToSmMs = async (file: File): Promise<string> => {
  const formData = new FormData()
  formData.append('smfile', file)
  
  const response = await fetch('https://sm.ms/api/v2/upload', {
    method: 'POST',
    body: formData
  })
  const data = await response.json()
  if (data.success) return data.data.url
  throw new Error(data.data || 'sm.ms上传失败')
}

// 主上传函数（自动转换为 WebP 并上传）
export const uploadToImgBB = async (file: File, convertToWebPFormat = true): Promise<string> => {
  // 自动转换为 WebP 格式（如果还不是 WebP）
  let fileToUpload = file
  if (convertToWebPFormat && !file.type.includes('webp')) {
    try {
      fileToUpload = await convertToWebP(file)
    } catch (convertError) {
      console.warn('WebP 转换失败，使用原图上传:', convertError)
      fileToUpload = file
    }
  }
  
  // 先尝试 ImgBB
  try {
    const base64 = await fileToBase64(fileToUpload)
    return await uploadToImgBBService(base64)
  } catch (imgbbError) {
    console.warn('ImgBB 上传失败，尝试备用图床:', imgbbError)
    
    // 备用：尝试 sm.ms
    try {
      // 如果 ImgBB 失败且之前转换过 WebP，尝试用原图上传到 sm.ms
      return await uploadToSmMs(fileToUpload)
    } catch (smmsError) {
      console.error('sm.ms 也失败了:', smmsError)
      throw new Error('图片上传服务暂时不可用，请稍后重试')
    }
  }
}

// 批量上传图片（自动转换为 WebP）
export const uploadMultipleToImgBB = async (
  files: File[],
  onProgress?: (index: number, total: number) => void,
  convertToWebPFormat = true
): Promise<string[]> => {
  const results: string[] = []
  
  for (let i = 0; i < files.length; i++) {
    const url = await uploadToImgBB(files[i], convertToWebPFormat)
    results.push(url)
    onProgress?.(i + 1, files.length)
  }
  
  return results
}
