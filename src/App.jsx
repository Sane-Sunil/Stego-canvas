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
  const [coverFileName, setCoverFileName] = useState('')
  const [secretFileName, setSecretFileName] = useState('')


const getFileCategory = (file) => {
    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    const videoExtensions = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv', 'm4v']
    const audioExtensions = ['mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a', 'wma']
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff']
    const documentExtensions = ['pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx', 'zip', 'rar', '7z']

    if (videoExtensions.includes(extension)) return 'video'
    if (audioExtensions.includes(extension)) return 'audio'
    if (imageExtensions.includes(extension)) return 'image'
    if (documentExtensions.includes(extension)) return 'document'
    return 'unknown'
  }

const handleCoverImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setCoverFileName(file.name)
      setCoverFileSize(file.size)

      // Read file as data URL to preserve original format
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataURL = e.target.result
          if (!dataURL) {
            console.error('Failed to read file')
            setCoverImage(null)
            return
          }

        // Extract MIME type from dataURL for reliable detection
        const dataURLMimeType = dataURL.split(';')[0].split(':')[1] || ''
        const fileCategory = getFileCategory(file)
        const isImageType = dataURLMimeType.startsWith('image/')
        const isVideoType = dataURLMimeType.startsWith('video/') || fileCategory === 'video'
        const isAudioType = dataURLMimeType.startsWith('audio/') || fileCategory === 'audio'

        // Strict image detection: require both dataURL MIME type AND file extension to be image
        const isImage = isImageType && fileCategory === 'image'

        setCoverImage({
          dataURL: dataURL,
          type: dataURLMimeType || file.type,
          name: file.name,
          size: file.size,
          isVideo: isVideoType,
          isImage: isImage,
          isAudio: isAudioType,
          isBinary: !isImage
        })
      }
      reader.onerror = () => {
        console.error('FileReader error')
        setCoverImage(null)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSecretUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSecretFileName(file.name)
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
    let uint8Data
    if (typeof data === 'string') {
      // Convert string to Uint8Array
      uint8Data = new TextEncoder().encode(data)
    } else if (data instanceof Uint8Array) {
      uint8Data = data
    } else {
      throw new Error('Unsupported data type for encryption')
    }

    // Perform XOR on bytes
    const encryptedBytes = new Uint8Array(uint8Data.length)
    for (let i = 0; i < uint8Data.length; i++) {
      encryptedBytes[i] = uint8Data[i] ^ pass.charCodeAt(i % pass.length)
    }

    // Validate that encryption didn't create all zeros (which would indicate a problem)
    const hasNonZero = encryptedBytes.some(byte => byte !== 0)
    if (!hasNonZero) {
      console.warn('Encryption resulted in all zeros - password may be invalid')
    }

    return encryptedBytes
  }

  // Simple XOR decryption
  const decryptData = (encryptedData, pass) => {
    try {
      if (!pass || pass.length === 0) {
        throw new Error('Password is required for decryption')
      }

      let encryptedBytes
       
      if (typeof encryptedData === 'string') {
        // Handle legacy base64 encoded data
        const decodedData = atob(encryptedData)
        encryptedBytes = new Uint8Array(decodedData.length)
        for (let i = 0; i < decodedData.length; i++) {
          encryptedBytes[i] = decodedData.charCodeAt(i)
        }
      } else if (encryptedData instanceof Uint8Array) {
        encryptedBytes = encryptedData
      } else {
        throw new Error('Unsupported encrypted data type')
      }

      console.log('Decrypting with password:', pass)
      console.log('First 5 password chars:', Array.from(pass.slice(0, 5)).map(c => c.charCodeAt(0)))

      // Perform XOR decryption
      const decryptedBytes = new Uint8Array(encryptedBytes.length)
      for (let i = 0; i < encryptedBytes.length; i++) {
        const keyChar = pass.charCodeAt(i % pass.length)
        decryptedBytes[i] = encryptedBytes[i] ^ keyChar
      }

      console.log('First 10 decrypted bytes:', Array.from(decryptedBytes.slice(0, 10)))

      // Quick validation - check if decrypted data looks reasonable
      const hasPrintableChars = decryptedBytes.slice(0, 20).some(byte => 
        (byte >= 32 && byte <= 126) || byte === 124 // printable ASCII or '|'
      )

      if (!hasPrintableChars) {
        console.warn('Decrypted data contains no printable characters - password may be wrong')
      }

      return decryptedBytes
    } catch (error) {
      console.error('Decryption error:', error)
      return null
    }
  }

const handleEncode = async () => {
    if (!coverImage || !password) {
      alert('Please provide a cover file and a password')
      return
}

  
    try {
      // Prepare data to hide
      let fullData
      if (secretType === 'text') {
        const header = "text|"
        const textBytes = new TextEncoder().encode(secretText)
        fullData = new Uint8Array(header.length + textBytes.length)
        const headerBytes = new TextEncoder().encode(header)
        fullData.set(headerBytes)
        fullData.set(textBytes, headerBytes.length)
        console.log('Text data prepared - Header:', header, 'Text length:', secretText.length)
      } else {
        const metadata = JSON.stringify({ name: secretFileName, type: secretFileType })
        const encodedMetadata = btoa(metadata)
        const header = "file|" + encodedMetadata + "|"
        const headerBytes = new TextEncoder().encode(header)
        fullData = new Uint8Array(headerBytes.length + secretData.length)
        fullData.set(headerBytes)
        fullData.set(secretData, headerBytes.length)
        
        console.log('File data prepared - Header:', header)
        console.log('Original metadata:', metadata)
        console.log('Encoded metadata:', encodedMetadata)
        console.log('Original file data length:', secretData.length)
        console.log('Header length:', headerBytes.length)
        console.log('Full data length:', fullData.length)
        console.log('Full data preview:', Array.from(fullData.slice(0, Math.min(20, fullData.length))))
      }

       // Encrypt the data
      const encryptedData = encryptData(fullData, password)
      console.log('Encrypted data length:', encryptedData.length)
      console.log('Encrypted data preview:', Array.from(encryptedData.slice(0, Math.min(20, encryptedData.length))))

      // Verify encryption is reversible
      const testDecrypted = decryptData(encryptedData, password)
      if (!testDecrypted || testDecrypted.length !== fullData.length) {
        throw new Error('Encryption validation failed - data may not be recoverable')
      }
      
      // Verify the decrypted test data matches original
      const originalType = String.fromCharCode(...fullData.slice(0, 4))
      const testType = String.fromCharCode(...testDecrypted.slice(0, 4))
      if (originalType !== testType) {
        console.warn('Encryption test failed - type mismatch:', originalType, 'vs', testType)
      } else {
        console.log('Encryption validation passed - type:', testType)
      }

      if (coverImage.isImage) {
        // Use LSB steganography for images
        await encodeImageLSB(coverImage.dataURL, encryptedData)
      } else {
        // Use binary embedding for non-image files
        await encodeBinaryEmbedding(coverImage, encryptedData)
      }

      console.log('Encoding completed successfully')
    } catch (error) {
      console.error('Encoding error:', error)
      alert(error.message)
      setResultImage(null)
    }
  }

    

  
       const encodeImageLSB = async (imageDataURL, encryptedData) => {
    return new Promise((resolve, reject) => {
      const coverCanvas = document.createElement('canvas')
      const coverCtx = coverCanvas.getContext('2d')
      const coverImg = new Image()

      coverImg.onload = () => {
        try {
          coverCanvas.width = coverImg.width
          coverCanvas.height = coverImg.height
          coverCtx.drawImage(coverImg, 0, 0)

          const coverData = coverCtx.getImageData(0, 0, coverCanvas.width, coverCanvas.height)

          // Convert encrypted bytes to binary
          let dataBits = ''
          for (let i = 0; i < encryptedData.length; i++) {
            dataBits += encryptedData[i].toString(2).padStart(8, '0')
          }

          // Add length prefix (32 bits)
          const lengthBits = dataBits.length.toString(2).padStart(32, '0')
          const allBits = lengthBits + dataBits

          if (allBits.length > coverData.data.length / 2 - 32) {
            throw new Error('Cover image is too small to hide the secret data.')
          }

           // Embed the data using LSB
           const data = coverData.data
           console.log('Embedding', allBits.length, 'bits into', data.length / 4, 'pixels')
           
           for (let i = 0; i < allBits.length; i++) {
             const pixelIndex = Math.floor(i / 2) * 4
             const colorOffset = i % 2
             const bit = parseInt(allBits[i]) & 1
             data[pixelIndex + colorOffset] = (data[pixelIndex + colorOffset] & 254) | bit
           }

           // Verify some embedded bits
           console.log('First 20 embedded bits:', allBits.substring(0, 20))
           console.log('Verification - first 5 extracted bits:')
           for (let i = 0; i < 5; i++) {
             const pixelIndex = Math.floor((i + 32) / 2) * 4
             const colorOffset = (i + 32) % 2
             const extractedBit = data[pixelIndex + colorOffset] & 1
             console.log(`Bit ${i}: ${allBits[i + 32]} -> ${extractedBit}`)
           }

          // Set marker
          data[data.length - 4] = (data[data.length - 4] & 254) | 1

          coverCtx.putImageData(coverData, 0, 0)

          // Test extraction to verify data integrity
          console.log('Testing data extraction after embedding...')
          const testData = coverCtx.getImageData(0, 0, coverCanvas.width, coverCanvas.height)
          
          // Extract first few bits to verify embedding worked
          let testLengthBits = ''
          for (let i = 0; i < 32; i++) {
            const pixelIndex = Math.floor(i / 2) * 4
            const colorOffset = i % 2
            const bit = testData.data[pixelIndex + colorOffset] & 1
            testLengthBits += bit.toString()
          }
          
          const testLength = parseInt(testLengthBits, 2)
          console.log('Verification - Embedded length:', allBits.length, 'bits, Extracted length:', testLength, 'bits')
          
          if (testLength !== allBits.length) {
            console.warn('Length mismatch detected during verification!')
            console.log('Difference:', testLength - allBits.length, 'bits')
            console.log('This may affect data extraction')
          }

 // Always use PNG format for LSB steganography to avoid compression artifacts
          // JPEG compression will corrupt LSB data
          const resultUrl = coverCanvas.toDataURL('image/png')
          console.log('Using PNG format to preserve LSB data')
          
          // Set result with PNG format for LSB compatibility
          setResultImage({
            dataURL: resultUrl,
            type: 'image/png',
            name: `stego-cover.png`,
            isImage: true
          })
          resolve()
        } catch (error) {
          reject(error)
        }
      }

      coverImg.onerror = () => {
        reject(new Error('Error loading cover image'))
      }

      coverImg.src = imageDataURL
    })
  }

  const encodeBinaryEmbedding = async (coverFile, encryptedData) => {
    try {
      // Convert data URL to binary
      const response = await fetch(coverFile.dataURL)
      const coverBuffer = await response.arrayBuffer()
      const coverBytes = new Uint8Array(coverBuffer)

      // Create stego marker and metadata
      const marker = "STEGO|"
      const metadata = JSON.stringify({
        originalName: coverFile.name,
        originalType: coverFile.type,
        originalSize: coverFile.size
      })

      // Prepare all data to append
      const markerBytes = new TextEncoder().encode(marker)
      const metadataBytes = new TextEncoder().encode(metadata)
      const separatorBytes = new TextEncoder().encode("|")

      // Create new file with hidden data appended
      const stegoBytes = new Uint8Array(
        coverBytes.length +
        markerBytes.length +
        metadataBytes.length +
        separatorBytes.length +
        encryptedData.length
      )

      // Copy original file
      stegoBytes.set(coverBytes, 0)
      let offset = coverBytes.length

      // Append marker and metadata
      stegoBytes.set(markerBytes, offset)
      offset += markerBytes.length

      stegoBytes.set(metadataBytes, offset)
      offset += metadataBytes.length

      stegoBytes.set(separatorBytes, offset)
      offset += separatorBytes.length

      // Append encrypted data
      stegoBytes.set(encryptedData, offset)

      // Create blob with proper MIME type
      const finalBlob = new Blob([stegoBytes], { 
        type: coverFile.type || 'application/octet-stream' 
      })
      const resultUrl = URL.createObjectURL(finalBlob)

      setResultImage({
        dataURL: resultUrl,
        type: coverFile.type || 'application/octet-stream',
        name: `stego-${coverFile.name}`,
        isBinary: true
      })

    } catch (error) {
      throw new Error('Failed to encode binary file: ' + error.message)
    }
  }

  const handleDecode = async () => {
    if (!coverImage || !password) {
      alert('Please provide a stego file and password')
      return
    }

    console.log('=== DECODE DEBUG INFO ===')
    console.log('Password:', password)
    console.log('Password length:', password.length)
    console.log('Password char codes:', Array.from(password).map(c => c.charCodeAt(0)))

    try {
      if (coverImage.isImage) {
        // Decode using LSB steganography for images
        await decodeImageLSB()
      } else {
        // Decode using binary embedding for non-image files
        await decodeBinaryEmbedding()
      }
    } catch (error) {
      console.error('Decoding error:', error)
      
      // Provide more helpful error messages
      if (error.message.includes('No type separator found')) {
        alert(error.message + '\n\nCommon causes:\n1. Wrong password (most common)\n2. Image was modified after encoding\n3. Different encoding/decoding algorithm')
      } else {
        alert(error.message)
      }
      setDecodedImage(null)
      setDecodedText('')
    }
  }

  const decodeImageLSB = async () => {
    return new Promise((resolve, reject) => {
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
             lengthBits += bit.toString()
           }

           console.log('Extracted length bits:', lengthBits)
           const messageLength = parseInt(lengthBits, 2)
           console.log('Calculated message length:', messageLength, 'bits')

          if (messageLength <= 0) {
            throw new Error('No hidden data found in this image')
          }

          // Extract data bits
          let dataBits = ''
          const maxDataIndex = data.length - 4 // Leave room for marker

          for (let i = 0; i < messageLength; i++) {
            const pixelIndex = Math.floor((i + 32) / 2) * 4
            const colorOffset = (i + 32) % 2
            const dataIndex = pixelIndex + colorOffset

            if (dataIndex > maxDataIndex) {
              console.log(`Stopping extraction at bit ${i} due to end of image data`)
              break
            }

            // Extract the LSB and ensure it's a valid bit (0 or 1)
            const bit = data[dataIndex] & 1
            dataBits += bit.toString()
          }

          console.log('Extracted bits length:', dataBits.length)
          console.log('Expected bits length:', messageLength)

          // Convert bits to encrypted bytes
          const encryptedBytes = []
          console.log('Converting bits to bytes...')
          
          for (let i = 0; i < dataBits.length; i += 8) {
            const byteStr = dataBits.substr(i, 8)
            if (byteStr.length === 8) {
              const byteValue = parseInt(byteStr, 2)
              encryptedBytes.push(byteValue)
              
              // Debug first few bytes
              if (i < 32) {
                console.log(`Byte ${i/8}: bits="${byteStr}" -> value=${byteValue}`)
              }
            }
          }

          // Validate that we extracted the correct number of bytes
          const expectedByteCount = Math.floor(dataBits.length / 8)
          if (encryptedBytes.length !== expectedByteCount) {
            console.warn(`Expected ${expectedByteCount} bytes, got ${encryptedBytes.length}`)
          }

          // Validate the extracted data before processing
          if (encryptedBytes.length === 0) {
            throw new Error('No valid data extracted from image')
          }

          // Check if the extracted data looks reasonable (not all zeros or corrupted)
          const hasValidData = encryptedBytes.some(byte => byte !== 0)
          if (!hasValidData) {
            throw new Error('Extracted data appears to be empty or corrupted')
          }

          console.log('First 20 extracted bytes:', Array.from(encryptedBytes.slice(0, 20)))

          // Quick validation: check if the first few bytes could be "file|"
          const firstBytesString = String.fromCharCode(...encryptedBytes.slice(0, 10))
          console.log('First bytes as string:', firstBytesString)

          processDecryptedData(new Uint8Array(encryptedBytes), resolve, reject)

        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = coverImage.dataURL
    })
  }

  const decodeBinaryEmbedding = async () => {
    try {
      // Convert data URL to binary
      const response = await fetch(coverImage.dataURL)
      const stegoBuffer = await response.arrayBuffer()
      const stegoBytes = new Uint8Array(stegoBuffer)

      // Look for stego marker
      const marker = "STEGO|"
      const markerBytes = new TextEncoder().encode(marker)

      let markerIndex = -1
      for (let i = 0; i <= stegoBytes.length - markerBytes.length; i++) {
        let match = true
        for (let j = 0; j < markerBytes.length; j++) {
          if (stegoBytes[i + j] !== markerBytes[j]) {
            match = false
            break
          }
        }
        if (match) {
          markerIndex = i
          break
        }
      }

      if (markerIndex === -1) {
        throw new Error('No hidden data found in this file')
      }

      // Extract metadata and encrypted data
      let offset = markerIndex + markerBytes.length
      let metadataEnd = -1

      // Find metadata separator
      for (let i = offset; i < stegoBytes.length; i++) {
        if (stegoBytes[i] === 124) { // ASCII for '|'
          metadataEnd = i
          break
        }
      }

      if (metadataEnd === -1) {
        throw new Error('Invalid stego file format')
      }

      // Extract metadata
      const metadataBytes = stegoBytes.slice(offset, metadataEnd)
      const metadataStr = new TextDecoder().decode(metadataBytes)
      JSON.parse(metadataStr)

      // Extract encrypted data
      const encryptedData = stegoBytes.slice(metadataEnd + 1)

      // Process the decrypted data
      await processDecryptedData(encryptedData,
        () => {},
        (error) => { throw error })

    } catch (error) {
      throw new Error('Failed to decode binary file: ' + error.message)
    }
  }

  const processDecryptedData = async (encryptedData, resolve, reject) => {
    try {
      // Validate password
      if (!password || password.length < 1) {
        throw new Error('Password is required for decryption')
      }

      console.log('Attempting decryption with password:', password.length, 'characters')
      console.log('Encrypted data length:', encryptedData.length)
      console.log('First 20 bytes of encrypted data:', Array.from(encryptedData.slice(0, 20)))

      // Decrypt and process
      const decryptedBytes = decryptData(encryptedData, password)
      if (!decryptedBytes) {
        throw new Error('Failed to decrypt data. The password may be incorrect.')
      }

      console.log('Decrypted data length:', decryptedBytes.length)

      // Try to decode as UTF-8 first to see the structure
      const decodedString = new TextDecoder('utf-8', { fatal: false }).decode(decryptedBytes)
      console.log('Decrypted data as string:', decodedString.substring(0, 100))

      // Find first separator for type
      let firstSeparatorIndex = -1
      for (let i = 0; i < decryptedBytes.length; i++) {
        if (decryptedBytes[i] === 124) { // ASCII for '|'
          firstSeparatorIndex = i
          break
        }
      }

      // If no separator found, try to find readable text patterns
      if (firstSeparatorIndex === -1) {
        console.log('Looking for alternative separators...')
        // Try to decode as string and look for separators
        const decodedStringAlt = String.fromCharCode(...decryptedBytes.slice(0, Math.min(100, decryptedBytes.length)))
        console.log('Decoded string preview:', decodedStringAlt)
        
        // Look for "text" or "file" patterns in the decoded string
        const textIndex = decodedStringAlt.indexOf('text')
        const fileIndex = decodedStringAlt.indexOf('file')
        
        if (textIndex !== -1 && decodedStringAlt[textIndex + 4] === '|') {
          firstSeparatorIndex = textIndex + 4
          console.log('Found text pattern at position:', textIndex)
        } else if (fileIndex !== -1 && decodedStringAlt[fileIndex + 4] === '|') {
          firstSeparatorIndex = fileIndex + 4
          console.log('Found file pattern at position:', fileIndex)
        }
      }

      if (firstSeparatorIndex === -1) {
        console.log('No separator found in decrypted data')
        console.log('First 50 bytes:', Array.from(decryptedBytes.slice(0, 50)))
        console.log('Decrypted data as string attempt:', String.fromCharCode(...decryptedBytes.slice(0, 50)))
        
        // Check for common password issues
        const entropy = new Set(decryptedBytes.slice(0, 50)).size
        const isHighEntropy = entropy > 40
        
        if (isHighEntropy) {
          console.error('High entropy data detected - likely wrong password')
          throw new Error('Decryption failed: The data appears to be encrypted with a different password. Please verify you are using the exact same password used during encoding.')
        }
        
        // Last resort: try to find readable text patterns
        console.log('Attempting alternative decoding approaches...')
        
        // Check if data might be incorrectly decrypted by looking for common patterns
        const dataAsString = String.fromCharCode(...decryptedBytes).toLowerCase()
        if (dataAsString.includes('text') || dataAsString.includes('file')) {
          console.log('Found text/file patterns in alternative decoding')
          // Try to extract using string methods
          const match = dataAsString.match(/(text|file)\|/)
          if (match) {
            firstSeparatorIndex = match.index + match[0].length
            console.log('Using alternative separator position:', firstSeparatorIndex)
          }
        }
        
        if (firstSeparatorIndex === -1) {
          throw new Error('Invalid data format: No type separator found. The data may not be properly encoded or the password might be incorrect.\n\nHint: Make sure you are using the exact same password (case-sensitive) that was used to encode the image.')
        }
      }

      const typeBytes = decryptedBytes.slice(0, firstSeparatorIndex)
      // Use TextDecoder for proper UTF-8 decoding
      let type
      try {
        type = new TextDecoder('utf-8', { fatal: true }).decode(typeBytes).trim()
      } catch {
        // Fallback to simple ASCII conversion if UTF-8 fails
        type = String.fromCharCode(...typeBytes).trim()
      }
      const remainingData = decryptedBytes.slice(firstSeparatorIndex + 1)
      
      console.log('Raw type bytes:', Array.from(typeBytes))
      console.log('Data type:', `"${type}"`)
      console.log('Remaining data length:', remainingData.length)
      console.log('First 20 bytes of remaining data:', Array.from(remainingData.slice(0, 20)))

      if (type === 'text') {
        // Convert bytes to text
        let text
        try {
          const decoder = new TextDecoder('utf-8', { fatal: true })
          text = decoder.decode(remainingData)
        } catch {
          // Fallback to simple ASCII conversion if UTF-8 fails
          text = String.fromCharCode(...remainingData)
        }
        setDecodedText(text)
        setDecodedImage(null)
        if (resolve) resolve()
      } else if (type === 'file') {
        // Find second separator for metadata
        let secondSeparatorIndex = -1
        for (let i = 0; i < remainingData.length; i++) {
          if (remainingData[i] === 124) { // ASCII for '|'
            secondSeparatorIndex = i
            break
          }
        }

        if (secondSeparatorIndex === -1) {
          throw new Error('Invalid file data format')
        }

        try {
          const metadataBytes = remainingData.slice(0, secondSeparatorIndex)
          const metadataStr = new TextDecoder('utf-8').decode(metadataBytes)
          
          // Decode the base64 metadata first
          let decodedMetadata
          try {
            decodedMetadata = atob(metadataStr)
            console.log('Base64 metadata:', metadataStr)
            console.log('Decoded metadata:', decodedMetadata)
          } catch (e) {
            // If it's not base64, try parsing directly
            decodedMetadata = metadataStr
            console.log('Using raw metadata (not base64):', metadataStr)
          }
          
          const metadata = JSON.parse(decodedMetadata)
          const fileBytes = remainingData.slice(secondSeparatorIndex + 1)

          console.log('Metadata:', metadata)
          console.log('File bytes length:', fileBytes.length)
          console.log('First 10 file bytes:', Array.from(fileBytes.slice(0, 10)))

          const blob = new Blob([fileBytes], { type: metadata.type })
          const revealedUrl = URL.createObjectURL(blob)
          console.log('Successfully reconstructed hidden file:', metadata.name)
          setDecodedImage(revealedUrl)
          setDecodedText('')
          if (resolve) resolve()
        } catch (error) {
          console.error('Error parsing file metadata:', error)
          throw new Error('Failed to parse file metadata: ' + error.message)
        }
      } else {
        console.error('Unexpected data type:', `"${type}"`)
        console.error('Expected "text" or "file"')
        console.error('First 50 bytes of decrypted data:', Array.from(decryptedBytes.slice(0, 50)))
        console.error('Decrypted string preview:', decodedString.substring(0, 100))
        throw new Error(`Invalid data type: "${type}". Expected "text" or "file". The data may be corrupted or the password might be incorrect.`)
      }

    } catch (error) {
      if (reject) reject(error)
      else throw error
    }
  }



  // Add this helper function at the top of your component
  const downloadImage = (dataUrl, fileName) => {
    // Add proper file extension if missing
    if (!fileName.includes('.')) {
      if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
        const mimeType = dataUrl.split(';')[0].split(':')[1]
        const extension = mimeType.split('/')[1] || 'png'
        fileName += `.${extension}`
      }
    }
    
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
                <div className={`toggle-slider ${secretType === 'text' ? 'text-active' : ''}`}>
                  <div 
                    className={`toggle-option ${secretType === 'file' ? 'active' : ''}`}
                    onClick={() => setSecretType('file')}
                  >
                    File
                  </div>
                  <div 
                    className={`toggle-option ${secretType === 'text' ? 'active' : ''}`}
                    onClick={() => setSecretType('text')}
                  >
                    Text
                  </div>
                </div>
              </div>
             <div className="image-upload">
               <h3>Cover File:</h3>
<input type="file" accept="*/*" onChange={handleCoverImageUpload} />
              {coverImage && (
                <div className="image-preview">
                  {coverImage.isImage ? (
                    <img src={coverImage.dataURL} alt="Cover" className="preview" />
                  ) : coverImage.isVideo ? (
                    <video src={coverImage.dataURL} controls className="preview" />
                  ) : coverImage.isAudio ? (
                    <audio src={coverImage.dataURL} controls className="preview" />
                  ) : (
                    <div className="file-preview">
                      <div className="file-icon">📁</div>
                      <p>{coverFileName}</p>
                    </div>
                  )}
                  <p>Cover file: {coverFileName} ({coverFileSize >= 1024 * 1024 * 1024 ? `${(coverFileSize / (1024 * 1024 * 1024)).toFixed(2)} GB` : coverFileSize >= 1024 * 1024 ? `${(coverFileSize / (1024 * 1024)).toFixed(2)} MB` : `${coverFileSize} bytes`})</p>
                  <button
                    className="download-btn"
                    onClick={() => downloadImage(coverImage.dataURL, `cover-${coverFileName}`)}
                  >
                    Download Cover File
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
                 <h3>Result File:</h3>
                 {resultImage.isImage || (typeof resultImage === 'string' && resultImage.startsWith('data:image/')) ? (
                   <img src={resultImage.dataURL || resultImage} alt="Result" className="preview" />
                 ) : null}
                 <button 
                   className="download-btn"
                   onClick={() => downloadImage(
                     resultImage.dataURL || resultImage, 
                     resultImage.name || 'stego-file'
                   )}
                 >
                   Download Encoded File
                 </button>
               </div>
             )}
          </div>
        ) : (
          <div className="decode-section">
            <div className="image-upload">
              <h3>Uncover mystery:</h3>
              <input type="file" accept="*/*" onChange={handleCoverImageUpload} />
{coverImage && (
                <div className="image-preview">
                  {coverImage.isImage ? (
                    <img src={coverImage.dataURL} alt="To decode" className="preview" />
                  ) : coverImage.isVideo ? (
                    <video src={coverImage.dataURL} controls className="preview" />
                  ) : coverImage.isAudio ? (
                    <audio src={coverImage.dataURL} controls className="preview" />
                  ) : (
                    <div className="file-preview">
                      <div className="file-icon">🔐</div>
                      <p>{coverFileName}</p>
                    </div>
                  )}
                  <button 
                    className="download-btn"
                    onClick={() => downloadImage(coverImage.dataURL, `stego-${coverFileName}`)}
                  >
                    Download Stego File
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
