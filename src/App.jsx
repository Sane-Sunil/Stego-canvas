import { useState } from 'react'
import './App.css'


function App() {
  const [mode, setMode] = useState('encode')
  const [coverImage, setCoverImage] = useState(null)
  const [secretImage, setSecretImage] = useState(null)
  const [password, setPassword] = useState('')
  const [resultImage, setResultImage] = useState(null)
  const [decodedImage, setDecodedImage] = useState(null)
  const [requiredPixels, setRequiredPixels] = useState(0)
  const [secretFileSize, setSecretFileSize] = useState(0)
  const [coverFileSize, setCoverFileSize] = useState(0)
   const [secretData, setSecretData] = useState(null)
   const [secretType, setSecretType] = useState('file')
   const [secretText, setSecretText] = useState('')
   const [decodedText, setDecodedText] = useState('')
   const [secretFileType, setSecretFileType] = useState('')

   const handleCoverImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setCoverFileSize(file.size)
      const reader = new FileReader()
      reader.onload = (e) => setCoverImage(e.target.result)
      reader.readAsDataURL(file)
    }
  }

  const handleSecretUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Read as data URL for display (only if image)
      if (file.type.startsWith('image/')) {
        const readerDataURL = new FileReader()
        readerDataURL.onload = (e) => setSecretImage(e.target.result)
        readerDataURL.readAsDataURL(file)
      } else {
        setSecretImage(null)
      }

       // Read as array buffer for data
       const readerArrayBuffer = new FileReader()
       readerArrayBuffer.onload = (e) => {
         const arrayBuffer = e.target.result
         const uint8Array = new Uint8Array(arrayBuffer)
         setSecretData(uint8Array)
         setSecretFileType(file.type)
         // Calculate required cover size based on file size
         const fileSize = file.size
         setSecretFileSize(fileSize)
         const header = `file|${file.type}|`
         const fullDataLength = header.length + fileSize
         const encryptedLength = Math.ceil(fullDataLength * 4 / 3)
         const dataBitsLength = encryptedLength * 8
         const allBitsLength = 32 + dataBitsLength
         const requiredPixels = Math.ceil(allBitsLength / 2)
         setRequiredPixels(requiredPixels)
       }
      readerArrayBuffer.readAsArrayBuffer(file)
    }
  }

  const handleSecretTextChange = (e) => {
    const text = e.target.value
    setSecretText(text)
    const encoder = new TextEncoder()
    const uint8Array = encoder.encode(text)
    setSecretData(uint8Array)
    setSecretFileType('')
    const fileSize = uint8Array.length
    setSecretFileSize(fileSize)
    const header = "text|"
    const fullDataLength = header.length + fileSize
    const encryptedLength = Math.ceil(fullDataLength * 4 / 3)
    const dataBitsLength = encryptedLength * 8
    const allBitsLength = 32 + dataBitsLength
    const requiredPixels = Math.ceil(allBitsLength / 2)
    setRequiredPixels(requiredPixels)
  }

  // Simple XOR encryption
  const encryptData = (data, pass) => {
    let result = ''
    for(let i = 0; i < data.length; i++) {
      result += String.fromCharCode(data.charCodeAt(i) ^ pass.charCodeAt(i % pass.length))
    }
    return btoa(result)
  }

  // Simple XOR decryption
  const decryptData = (encoded, pass) => {
    try {
      // First decode from Base64
      const encryptedData = atob(encoded)
      let result = ''
      for(let i = 0; i < encryptedData.length; i++) {
        const encryptedChar = encryptedData.charCodeAt(i)
        const passChar = pass.charCodeAt(i % pass.length)
        const decryptedChar = encryptedChar ^ passChar
        result += String.fromCharCode(decryptedChar)
      }
      return result
    } catch {
      return null
    }
  }

  const handleEncode = async () => {
    if (!coverImage || !secretData || !password) {
      alert('Please provide cover image, secret data, and a password')
      return
    }
    if (!secretData) {
      alert('Secret data not loaded. Please re-upload the secret image.')
      return
    }

    const coverCanvas = document.createElement('canvas')
    const coverCtx = coverCanvas.getContext('2d')

    const coverImg = new Image()

    coverImg.onload = () => {
      try {
        coverCanvas.width = coverImg.width
        coverCanvas.height = coverImg.height
        coverCtx.drawImage(coverImg, 0, 0)

        // Hide the secret file bytes
        // Get image data
        const coverData = coverCtx.getImageData(0, 0, coverCanvas.width, coverCanvas.height)

        // Check if the secret data can fit
        const tempHeader = secretType === 'text' ? "text|" : `file|${secretFileType}|`
        const tempFullData = tempHeader + Array.from(secretData).join(',')
        const tempEncryptedData = encryptData(tempFullData, password)
        const tempDataBits = tempEncryptedData.split('').map(char =>
          char.charCodeAt(0).toString(2).padStart(8, '0')
        ).join('')
        const tempLengthBits = tempDataBits.length.toString(2).padStart(32, '0')
        const tempAllBits = tempLengthBits + tempDataBits

        if (tempAllBits.length > coverData.data.length / 2 - 32) {
          throw new Error('Cover image is too small to hide the secret file. Please use a larger cover image.')
        }

        // Prepare the data to hide
        const header = secretType === 'text' ? "text|" : `file|${secretFileType}|`
        const fullData = header + Array.from(secretData).join(',')

        // Encrypt the data
        const encryptedData = encryptData(fullData, password)

        // Convert to binary
        const dataBits = encryptedData.split('').map(char =>
          char.charCodeAt(0).toString(2).padStart(8, '0')
        ).join('')

        // Add length prefix (32 bits)
        const lengthBits = dataBits.length.toString(2).padStart(32, '0')
        const allBits = lengthBits + dataBits

        // Embed the data
        const data = coverData.data
        for (let i = 0; i < allBits.length; i++) {
          const pixelIndex = Math.floor(i / 2) * 4
          const colorOffset = i % 2
          data[pixelIndex + colorOffset] = (data[pixelIndex + colorOffset] & 254) | parseInt(allBits[i])
        }

        // Set marker
        data[data.length - 4] = (data[data.length - 4] & 254) | 1

        coverCtx.putImageData(coverData, 0, 0)
        const resultUrl = coverCanvas.toDataURL('image/png')
        setResultImage(resultUrl)

        console.log('Encoding completed successfully')
      } catch (error) {
        console.error('Encoding error:', error)
        alert(error.message)
        setResultImage(null)
      }
    }

    coverImg.onerror = () => {
      alert('Error loading cover image')
      setResultImage(null)
    }

    coverImg.src = coverImage
  }

  const handleDecode = async () => {
    if (!coverImage || !password) {
      alert('Please provide an image and password')
      return
    }

    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        try {
          canvas.width = img.width
          canvas.height = img.height
          ctx.drawImage(img, 0, 0)
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const data = imageData.data
          
           // Extract length (first 32 bits)
           let lengthBits = ''
           for (let i = 0; i < 32; i++) {
             const pixelIndex = Math.floor(i / 2) * 4
             const colorOffset = i % 2
             const bit = data[pixelIndex + colorOffset] & 1
             lengthBits += bit
           }

           const messageLength = parseInt(lengthBits, 2)
          
          if (messageLength <= 0) {
            throw new Error('No hidden data found in this image')
          }

           // Extract data bits
           let dataBits = ''
           const maxDataIndex = data.length - 1

           for (let i = 0; i < messageLength; i++) {
             const pixelIndex = Math.floor((i + 32) / 2) * 4
             const colorOffset = (i + 32) % 2
             const dataIndex = pixelIndex + colorOffset

             if (dataIndex > maxDataIndex) {
               // Stop if we run out of image data
               console.log(`Stopping extraction at bit ${i} due to end of image data`)
               break
             }

             dataBits += data[dataIndex] & 1
           }
          
          // Convert to encrypted data
          let encryptedData = ''
          for (let i = 0; i < dataBits.length; i += 8) {
            const byte = dataBits.substr(i, 8)
            if (byte.length === 8) {
              encryptedData += String.fromCharCode(parseInt(byte, 2))
            }
          }
          

          
          // Decrypt and process
          const decrypted = decryptData(encryptedData, password)
          if (!decrypted) {
            throw new Error('Failed to decrypt data. Please check the password.')
          }



            // Split the decrypted data
            const firstSeparator = decrypted.indexOf('|')
            if (firstSeparator === -1) {
              throw new Error('Invalid data format')
            }

            const type = decrypted.substring(0, firstSeparator)
            const remaining = decrypted.substring(firstSeparator + 1)

            if (type === 'text') {
              // Convert bytes to text
              const fileBytes = remaining.split(',').map(Number)
              const decoder = new TextDecoder()
              const text = decoder.decode(new Uint8Array(fileBytes))
              setDecodedText(text)
              setDecodedImage(null)
            } else if (type === 'file') {
              // Parse mime type
              const secondSeparator = remaining.indexOf('|')
              if (secondSeparator === -1) {
                throw new Error('Invalid file data format')
              }
              const mimeType = remaining.substring(0, secondSeparator)
              const fileBytesStr = remaining.substring(secondSeparator + 1)
              // Convert file bytes
              const fileBytes = fileBytesStr.split(',').map(Number)
              const blob = new Blob([new Uint8Array(fileBytes)], { type: mimeType })
              const revealedUrl = URL.createObjectURL(blob)
              console.log('Successfully reconstructed hidden file')
              setDecodedImage(revealedUrl)
              setDecodedText('')
            } else {
              throw new Error('Invalid data type')
            }
          
        } catch (error) {
          console.error('Processing error:', error)
          alert(error.message)
          setDecodedImage(null)
        }
      }
      
      img.onerror = () => {
        console.error('Failed to load image')
        alert('Error loading the image. Please try again.')
        setDecodedImage(null)
      }
      
      img.src = coverImage
      
    } catch (error) {
      console.error('Decoding error:', error)
      alert(error.message)
      setDecodedImage(null)
    }
  }

  // Add this helper function at the top of your component
  const downloadImage = (dataUrl, fileName) => {
    fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => {
        const blobUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.style.display = 'none'
        link.href = blobUrl
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        setTimeout(() => {
          document.body.removeChild(link)
          window.URL.revokeObjectURL(blobUrl)
        }, 100)
      })
      .catch(err => {
        console.error('Download failed:', err)
        alert('Failed to download the image. Please try again.')
      })
  }

  // Add this function to extract the cover image
  const extractCoverImage = (encodedImageData) => {
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      return new Promise((resolve, reject) => {
        img.onload = () => {
          canvas.width = img.width
          canvas.height = img.height
          ctx.drawImage(img, 0, 0)
          
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const data = imageData.data
          
          // Clear LSB of first two color channels where data was hidden
          for (let i = 0; i < data.length; i += 4) {
            data[i] = data[i] & 254     // Clear LSB of red channel
            data[i + 1] = data[i + 1] & 254  // Clear LSB of green channel
          }
          
          ctx.putImageData(imageData, 0, 0)
          resolve(canvas.toDataURL('image/png'))
        }
        
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = encodedImageData
      })
    } catch (error) {
      console.error('Error extracting cover:', error)
      throw new Error('Failed to extract cover image')
    }
  }

  return (
    <>
      <div className="container">
        <h1>Mystery Image</h1>
        
        <div className="mode-selector">
          <button 
            className={mode === 'encode' ? 'active' : ''} 
            onClick={() => setMode('encode')}
          >
            Transfigure
          </button>
          <button 
            className={mode === 'decode' ? 'active' : ''} 
            onClick={() => setMode('decode')}
          >
            Untransfigure
          </button>
        </div>

        {mode === 'encode' ? (
          <div className="encode-section">
             <div className="secret-type-selector">
               <h3>What to hide:</h3>
               <label>
                 <input
                   type="radio"
                   value="file"
                   checked={secretType === 'file'}
                   onChange={(e) => setSecretType(e.target.value)}
                 />
                 File (image, audio, etc.)
               </label>
               <label>
                 <input
                   type="radio"
                   value="text"
                   checked={secretType === 'text'}
                   onChange={(e) => setSecretType(e.target.value)}
                 />
                 Text
               </label>
             </div>
             <div className="image-upload">
               <h3>Cover Image:</h3>
               <input type="file" accept="image/*" onChange={handleCoverImageUpload} />
               {coverImage && (
                 <div className="image-preview">
                   <img src={coverImage} alt="Cover" className="preview" />
                   <p>Cover file size: {coverFileSize >= 1024 * 1024 * 1024 ? `${(coverFileSize / (1024 * 1024 * 1024)).toFixed(2)} GB` : coverFileSize >= 1024 * 1024 ? `${(coverFileSize / (1024 * 1024)).toFixed(2)} MB` : `${coverFileSize} bytes`}</p>
                   <button
                     className="download-btn"
                     onClick={() => downloadImage(coverImage, 'cover-image.png')}
                   >
                     Download Cover Image
                   </button>
                 </div>
               )}
             </div>
            
              {secretType === 'file' ? (
                <div className="image-upload">
                  <h3>Secret File:</h3>
                  <input type="file" accept="*/*" onChange={handleSecretUpload} />
                  {secretImage && (
                    <div className="image-preview">
                      <img src={secretImage} alt="Secret" className="preview" />
                      <button
                        className="download-btn"
                        onClick={() => downloadImage(secretImage, 'secret-image.png')}
                      >
                        Download Secret File
                      </button>
                    </div>
                  )}
                  {requiredPixels > 0 && (
                    <p>Secret file size: {secretFileSize >= 1024 * 1024 * 1024 ? `${(secretFileSize / (1024 * 1024 * 1024)).toFixed(2)} GB` : secretFileSize >= 1024 * 1024 ? `${(secretFileSize / (1024 * 1024)).toFixed(2)} MB` : `${secretFileSize} bytes`}. Minimum cover file size needed: {((requiredPixels * 4) / (1024 * 1024)).toFixed(2)} MB (uncompressed estimate; requires at least {requiredPixels.toLocaleString()} pixels)</p>
                  )}
                </div>
              ) : (
                <div className="text-input">
                  <h3>Secret Text:</h3>
                  <textarea
                    placeholder="Enter the text to hide"
                    value={secretText}
                    onChange={handleSecretTextChange}
                    rows="10"
                    cols="50"
                  />
                  {secretText && (
                    <p>Text length: {secretText.length} characters</p>
                  )}
                </div>
              )}
            
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
             <button onClick={handleEncode}>Hide Data</button>
            {resultImage && (
              <div className="result">
                <h3>Result Image:</h3>
                <img src={resultImage} alt="Result" className="preview" />
                <button 
                  className="download-btn"
                  onClick={() => downloadImage(resultImage, 'stego-image.png')}
                >
                  Download Encoded Image
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="decode-section">
            <div className="image-upload">
              <h3>Uncover mystery:</h3>
              <input type="file" accept="image/*" onChange={handleCoverImageUpload} />
              {coverImage && (
                <div className="image-preview">
                  <img src={coverImage} alt="To decode" className="preview" />
                  <button 
                    className="download-btn"
                    onClick={async () => {
                      try {
                        const extractedCover = await extractCoverImage(coverImage)
                        downloadImage(extractedCover, 'extracted-cover.png')
                      } catch (error) {
                        alert('Failed to extract cover image: ' + error.message)
                      }
                    }}
                  >
                    Download Cover Image Only
                  </button>
                </div>
              )}
            </div>
            
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button onClick={handleDecode} className="reveal-btn">Revelio</button>
            
             {(decodedImage || decodedText) && (
               <div className="result">
                 {decodedText ? (
                   <>
                     <h3>Hidden Text:</h3>
                     <p>{decodedText}</p>
                   </>
                 ) : (
                   <>
                     <h3>Hidden File:</h3>
                     {decodedImage && decodedImage.startsWith('data:image/') ? (
                       <img src={decodedImage} alt="Decoded" className="preview" />
                     ) : null}
                     <button
                       className="download-btn"
                       onClick={() => downloadImage(decodedImage, 'revealed-file')}
                     >
                       Download Hidden File
                     </button>
                   </>
                 )}
               </div>
             )}
          </div>
        )}
      </div>
      <footer className="footer">
        <div className="footer-content">
          <div className="project-links">
            <div className="links-container">
              <a 
                href="https://github.com/Sane-Sunil/Stego-canvas" 
                target="_blank" 
                rel="noopener noreferrer"
                className="project-link"
              >
                <span>Source Code</span>
              </a>
              <a 
                href="/not-found" 
                className="project-link"
              >
                <img 
                  src="https://assets.vercel.com/image/upload/front/favicon/vercel/180x180.png" 
                  alt="Live Demo" 
                />
                <span>Live Demo</span>
              </a>
            </div>
          </div>
          <div className="creator-link">
            <a 
              href="https://github.com/Sane-Sunil/" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" alt="GitHub" />
              <span>Sane Sunil</span>
            </a>
          </div>
        </div>
      </footer>
    </>
  )
}

export default App
